declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: {
      head?: any[][];
      body?: any[][];
      startY?: number;
      theme?: string;
      headStyles?: any;
      styles?: any;
      columnStyles?: any;
      margin?: any;
      didDrawPage?: (data: any) => void;
    }) => jsPDF;
  }
}

declare module 'jspdf-autotable' {
  export default function autoTable(doc: any, options: any): void;
} 