import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { companiesApi } from "../lib/companies-api";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Spinner } from "../components/Spinner";
import { CreateCompanyData, CompanyType } from "../types";

const initialState: CreateCompanyData = {
  name: "",
  registrationNumber: "",
  type: CompanyType.CONTRACTING,
  address: "",
  email: "",
  contactNumber: "",
  website: "",
  experience: [],
  certifications: [],
};

export default function RegisterCompany() {
  const [form, setForm] = useState<CreateCompanyData>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (value: string) => {
    setForm({ ...form, type: value as CompanyType });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await companiesApi.createCompany(form);
      navigate("/company");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to register company";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-100">
      <Card className="w-full max-w-lg p-8 shadow-xl bg-white">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Register Your Company
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <Label htmlFor="registrationNumber">Registration Number</Label>
            <Input
              id="registrationNumber"
              name="registrationNumber"
              value={form.registrationNumber}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <Label htmlFor="type">Company Type</Label>
            <Select value={form.type} onValueChange={handleSelectChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CompanyType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="email">Company Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input
              id="contactNumber"
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <Label htmlFor="website">Website (Optional)</Label>
            <Input
              id="website"
              name="website"
              type="url"
              value={form.website}
              onChange={handleChange}
              placeholder="https://example.com"
              autoComplete="off"
            />
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner size="small" /> : "Register Company"}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            You can add experience and certifications after registration in your company settings.
          </p>
        </form>
      </Card>
    </div>
  );
}
