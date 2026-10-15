import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Calendar, 
  Package, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Zap,
  TrendingDown
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { procurementApi } from '@/lib/procurement-api';
import { timelineApi } from '@/lib/timeline-api';
import { financeApi } from '@/lib/finance-api';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface CountdownItem {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  type: 'procurement' | 'timeline' | 'finance';
  category: string;
  status?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  totalSeconds: number;
}

interface CountdownTimerProps {
  className?: string;
  maxItems?: number;
}

interface GroupedCountdowns {
  procurement: CountdownItem[];
  timeline: CountdownItem[];
  finance: CountdownItem[];
}

export function CountdownTimer({ className, maxItems = 6 }: CountdownTimerProps) {
  const { currentProject } = useProject();
  const [countdowns, setCountdowns] = useState<CountdownItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime] = useState(new Date());
  const [hoveredStackIndex, setHoveredStackIndex] = useState<number | null>(null);

  useEffect(() => {
    if (currentProject?._id) {
      loadCountdowns();
    }
  }, [currentProject]);

  const loadCountdowns = async () => {
    if (!currentProject?._id) return;
    
    try {
      setLoading(true);
      const countdownsList: CountdownItem[] = [];

      // Load procurement countdowns - API handles permission checks
      const [materialRequestsRes, purchaseOrdersRes] = await Promise.allSettled([
        procurementApi.getMaterialRequests(currentProject._id),
        procurementApi.getPurchaseOrders(currentProject._id)
      ]);

      const materialRequests = materialRequestsRes.status === 'fulfilled' ? materialRequestsRes.value : null;
      const purchaseOrders = purchaseOrdersRes.status === 'fulfilled' ? purchaseOrdersRes.value : null;

      // Material Request deadlines
      if (materialRequests?.data?.docs) {
        materialRequests.data.docs.forEach((request: any) => {
          if (request.materialDetails) {
            request.materialDetails.forEach((detail: any) => {
              if (detail.requiredByDate && request.status !== 'completed') {
                countdownsList.push({
                  id: `mr-${request._id}-${detail._id}`,
                  title: `Materials Needed`,
                  description: `${detail.materialName} • ${detail.quantity} ${detail.unit}`,
                  dueDate: new Date(detail.requiredByDate),
                  type: 'procurement',
                  category: 'Critical Materials',
                  status: request.status
                });
              }
            });
          }
        }); 
      }

      // Purchase Order delivery dates
      if (purchaseOrders?.data?.docs) {
        purchaseOrders.data.docs.forEach((po: any, index: number) => {
          if (po.deliveryDate && po.status !== 'delivered') {
            const orderNumber = po.poNumber || po.orderNumber || `PO-${String(index + 1).padStart(3, '0')}`;
            const itemCount = po.materialList?.length || po.items?.length || po.materialDetails?.length || 0;
            
            // Get total quantity of all materials
            const totalQuantity = po.materialList?.reduce((sum: number, material: any) => 
              sum + (material.quantity || 0), 0) || 0;
            
            countdownsList.push({
              id: `po-${po._id}`,
              title: `Delivery Expected`,
              description: `${orderNumber} • ${itemCount} types (${totalQuantity} units) arriving`,
              dueDate: new Date(po.deliveryDate),
              type: 'procurement',
              category: 'Supply Delivery',
              status: po.status
            });
          }
        });
      }

      // Load timeline countdowns
      const stagesRes = await timelineApi.getProjectStages(currentProject._id);
      if (stagesRes.data) {
        stagesRes.data.forEach((stage: any) => {
          if (stage.endDate && stage.status !== 'Completed') {
            countdownsList.push({
              id: `stage-${stage._id}`,
              title: `Milestone Due`,
              description: `${stage.stage} completion target`,
              dueDate: new Date(stage.endDate),
              type: 'timeline',
              category: 'Project Milestone',
              status: stage.status
            });
          }
        });
      }

      // Load finance countdowns (invoices due) - API handles permission checks
      try {
        const invoicesRes = await financeApi.getInvoices(currentProject._id);
        if (invoicesRes.data) {
          invoicesRes.data.forEach((invoice: any) => {
          if (invoice.dueDate && invoice.status !== 'paid') {
            const invoiceNumber = invoice.invoiceNumber || invoice.number || `INV-${invoice._id.slice(-6)}`;
            const amount = invoice.totalAmount || invoice.amount || 0;
            
            countdownsList.push({
              id: `invoice-${invoice._id}`,
              title: `Payment Due`,
              description: `${invoiceNumber} • ${formatCurrency(amount)}`,
              dueDate: new Date(invoice.dueDate),
              type: 'finance',
              category: 'Payment Deadline',
              status: invoice.status
            });
          }
        });
        }
      } catch (error) {
        // Permission errors handled by API layer
        console.debug('Finance data not accessible:', error);
      }

      // Sort by due date (nearest first)
      countdownsList.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

      setCountdowns(countdownsList.slice(0, maxItems));
    } catch (error) {
      console.error('Error loading countdowns:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeRemaining = (dueDate: Date): TimeRemaining => {
    const now = currentTime;
    const diff = dueDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: true, totalSeconds: 0 };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isOverdue: false, totalSeconds };
  };

  const groupCountdowns = (countdowns: CountdownItem[]): GroupedCountdowns => {
    return {
      procurement: countdowns.filter(c => c.type === 'procurement'),
      timeline: countdowns.filter(c => c.type === 'timeline'),
      finance: countdowns.filter(c => c.type === 'finance')
    };
  };

  // Create stacks for unified grid
  const createStacks = (countdowns: CountdownItem[]) => {
    const grouped = groupCountdowns(countdowns);
    const stacks = [];
    
    if (grouped.procurement.length > 0) {
      stacks.push({
        type: 'procurement',
        items: grouped.procurement,
        title: 'Supply & Materials',
        icon: <Package className="h-4 w-4 text-blue-600" />
      });
    }
    
    if (grouped.timeline.length > 0) {
      stacks.push({
        type: 'timeline',
        items: grouped.timeline,
        title: 'Project Milestones',
        icon: <Calendar className="h-4 w-4 text-green-600" />
      });
    }
    
    if (grouped.finance.length > 0) {
      stacks.push({
        type: 'finance',
        items: grouped.finance,
        title: 'Payments & Invoices',
        icon: <DollarSign className="h-4 w-4 text-purple-600" />
      });
    }
    
    return stacks;
  };

  // Calculate grid positions for stacks and expanded cards
  const calculateGridPositions = (stacks: any[], hoveredIndex: number | null, maxColumns = 3) => {
    const positions = [];
    let currentCol = 0;
    let currentRow = 0;
    
    stacks.forEach((stack, stackIndex) => {
      if (hoveredIndex === stackIndex) {
        // Expanded stack - place each card in grid
        stack.items.forEach((item: any, itemIndex: number) => {
          if (currentCol >= maxColumns) {
            currentCol = 0;
            currentRow++;
          }
          
          positions.push({
            stackIndex,
            itemIndex,
            col: currentCol,
            row: currentRow,
            isExpanded: true
          });
          
          currentCol++;
        });
      } else {
        // Collapsed stack - single position
        if (currentCol >= maxColumns) {
          currentCol = 0;
          currentRow++;
        }
        
        positions.push({
          stackIndex,
          itemIndex: -1, // -1 indicates this is a stack position
          col: currentCol,
          row: currentRow,
          isExpanded: false
        });
        
        currentCol++;
      }
    });
    
    return positions;
  };

  const getMostUrgentFromGroup = (items: CountdownItem[]): CountdownItem | null => {
    if (items.length === 0) return null;
    
    // Sort by total seconds remaining (ascending)
    const sorted = items.sort((a, b) => {
      const timeA = calculateTimeRemaining(a.dueDate);
      const timeB = calculateTimeRemaining(b.dueDate);
      return timeA.totalSeconds - timeB.totalSeconds;
    });
    
    return sorted[0];
  };



  // Grid-based animation variants
  const getGridCardVariants = (
    position: { col: number; row: number; isExpanded: boolean },
    itemIndex: number,
    totalInStack: number
  ) => {
    const cardWidth = 280;
    const cardHeight = 176;
    const gap = 16;
    
    // Grid position
    const gridX = position.col * (cardWidth + gap);
    const gridY = position.row * (cardHeight + gap);
    
    // Stacking offsets when collapsed
    const stackOffset = itemIndex * 3;
    const scaleReduction = itemIndex * 0.02;
    const rotationOffset = itemIndex * 0.5;
    
    if (position.isExpanded) {
      // Card is part of expanded stack
      return {
        x: gridX,
        y: gridY,
        rotate: 0,
        scale: 1,
        zIndex: 10,
        opacity: 1,
        transition: {
          type: "spring" as const,
          stiffness: 350,
          damping: 35,
          mass: 0.8,
          delay: itemIndex * 0.04
        }
      };
    } else {
      // Card is part of collapsed stack with stacking effect
      return {
        x: gridX - stackOffset,
        y: gridY - stackOffset,
        rotate: -rotationOffset,
        scale: 1 - scaleReduction,
        zIndex: totalInStack - itemIndex,
        opacity: itemIndex < 3 ? 1 - itemIndex * 0.15 : 0.3,
        transition: {
          type: "spring" as const,
          stiffness: 300,
          damping: 35,
          mass: 0.8,
          delay: (totalInStack - itemIndex - 1) * 0.02
        }
      };
    }
  };

  const formatTimeRemaining = (timeRemaining: TimeRemaining): JSX.Element => {
    if (timeRemaining.isOverdue) {
      return (
        <div className="flex items-center justify-center gap-1 text-red-600 font-bold animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <span>OVERDUE</span>
        </div>
      );
    }

    const { days, hours, minutes, seconds } = timeRemaining;
    
    // For urgent items (less than 1 hour), show seconds with animation
    if (days === 0 && hours === 0 && minutes < 60) {
      return (
        <div className="font-mono text-center">
          <div className="flex items-center justify-center gap-1 text-lg font-bold">
            {minutes > 0 && (
              <>
                <span className="animate-pulse text-orange-600">{minutes.toString().padStart(2, '0')}</span>
                <span className="text-muted-foreground">:</span>
              </>
            )}
            <span className="animate-pulse text-red-600">{seconds.toString().padStart(2, '0')}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {minutes > 0 ? 'min:sec' : 'seconds'}
          </div>
        </div>
      );
    }
    
    // For items with hours but less than a day
    if (days === 0 && hours > 0) {
      return (
        <div className="font-mono text-center">
          <div className="flex items-center justify-center gap-1 text-lg font-bold">
            <span className="animate-pulse text-yellow-600">{hours}</span>
            <span className="text-muted-foreground">:</span>
            <span className="animate-pulse text-orange-600">{minutes.toString().padStart(2, '0')}</span>
          </div>
          <div className="text-xs text-muted-foreground">hours:min</div>
        </div>
      );
    }
    
    // For items with days
    return (
      <div className="font-mono text-center">
        <div className="flex items-center justify-center gap-1 text-lg font-bold">
          <span className="animate-pulse text-blue-600">{days}</span>
          <span className="text-muted-foreground">d</span>
          <span className="animate-pulse text-green-600">{hours}</span>
          <span className="text-muted-foreground">h</span>
        </div>
        <div className="text-xs text-muted-foreground">days : hours</div>
      </div>
    );
  };

  const getUrgencyColor = (timeRemaining: TimeRemaining): string => {
    if (timeRemaining.isOverdue) {
      return 'bg-gradient-to-r from-red-100 to-red-200 border-red-300 shadow-red-100';
    }
    
    const { totalSeconds } = timeRemaining;
    
    if (totalSeconds <= 3600) { // Less than 1 hour - CRITICAL
      return 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300 shadow-red-100 animate-pulse';
    } else if (totalSeconds <= 86400) { // Less than 1 day - URGENT  
      return 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-300 shadow-orange-100';
    } else if (totalSeconds <= 604800) { // Less than 1 week - IMPORTANT
      return 'bg-gradient-to-r from-yellow-50 to-green-50 border-yellow-300 shadow-yellow-100';
    } else {
      return 'bg-gradient-to-r from-green-50 to-blue-50 border-green-300 shadow-green-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'procurement': return <Package className="h-4 w-4 text-blue-600" />;
      case 'timeline': return <Calendar className="h-4 w-4 text-green-600" />;
      case 'finance': return <DollarSign className="h-4 w-4 text-purple-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 animate-pulse text-blue-500" />
            What's Coming Up?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span>Finding your urgent deadlines...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (countdowns.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            All Caught Up!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-2 text-green-400" />
            <p className="text-center">No urgent deadlines right now.<br/>Take a breather!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stacks = createStacks(countdowns);
  const gridPositions = calculateGridPositions(stacks, hoveredStackIndex, 3);
  
  // Calculate total grid dimensions
  const maxRow = Math.max(...gridPositions.map(p => p.row), 0);
  const gridHeight = (maxRow + 1) * (176 + 16) - 16; // card height + gap, minus last gap

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            Time's Ticking
          </div>
          <Badge variant="outline" className="animate-pulse">
            {countdowns.length} urgent
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Unified Grid Container */}
        <motion.div
          className="relative w-full"
          style={{
            height: `${Math.max(gridHeight, 192)}px`,
            transition: 'height 0.5s ease-out'
          }}
        >
          {stacks.map((stack, stackIndex) => (
            stack.items.map((item, itemIndex) => {
              const timeRemaining = calculateTimeRemaining(item.dueDate);
              const urgencyColor = getUrgencyColor(timeRemaining);
              const isStackExpanded = hoveredStackIndex === stackIndex;
              
              // Find position for this card
              let position;
              if (isStackExpanded) {
                position = gridPositions.find(p => 
                  p.stackIndex === stackIndex && p.itemIndex === itemIndex
                );
              } else {
                // For collapsed stacks, all cards use the same base position with stacking offsets
                position = gridPositions.find(p => 
                  p.stackIndex === stackIndex && p.itemIndex === -1
                );
              }
              
              if (!position) return null;
              
              const variants = getGridCardVariants(position, itemIndex, stack.items.length);
              
              return (
                <motion.div
                  key={`${stack.type}-${item.id}`}
                  className={`absolute top-0 left-0 rounded-xl border-2 ${urgencyColor} backdrop-blur-sm shadow-lg cursor-pointer`}
                  animate={variants}
                  onMouseEnter={() => setHoveredStackIndex(stackIndex)}
                  onMouseLeave={() => setHoveredStackIndex(null)}
                  style={{
                    width: '280px',
                    height: '176px',
                    transformOrigin: "center center"
                  }}
                >
                  <div className="p-4 h-full flex flex-col overflow-hidden">
                    {/* Stack Header - only show for collapsed first card */}
                    {(itemIndex === 0 && !isStackExpanded) && (
                      <div className="flex items-center gap-2 mb-2">
                        {stack.icon}
                        <h3 className="font-semibold text-sm truncate">{stack.title}</h3>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {stack.items.length}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm mb-1 truncate">
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 overflow-hidden">
                          {item.description}
                        </p>
                      </div>
                      
                      {timeRemaining.isOverdue && (
                        <AlertTriangle className="h-4 w-4 text-red-500 animate-bounce ml-2 flex-shrink-0" />
                      )}
                    </div>

                    {/* Countdown Display */}
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-mono font-bold mb-1">
                          {formatTimeRemaining(timeRemaining)}
                        </div>
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(item.dueDate, 'MMM d • h:mm a')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="mt-auto">
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Stack count indicator for collapsed stacks */}
                  {!isStackExpanded && stack.items.length > 1 && itemIndex === 0 && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg z-10">
                      {stack.items.length}
                    </div>
                  )}
                </motion.div>
              );
            })
          ))}
        </motion.div>
        
        <motion.div 
          className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <Clock className="h-3 w-3" />
          <span>Live updates • {format(currentTime, 'h:mm:ss a')}</span>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
