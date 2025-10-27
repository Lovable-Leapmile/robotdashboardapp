import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import loginIllustration from "@/assets/login.gif";

const LoginForm = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt with:", { mobileNumber, password });
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Login Illustration */}
        <div className="flex justify-center pt-8 pb-4">
          <img 
            src={loginIllustration} 
            alt="Login illustration" 
            className="w-32 h-32 object-contain"
          />
        </div>

        {/* Login Title */}
        <div className="text-center pb-6">
          <h1 className="text-3xl font-bold" style={{ color: '#8E77C3' }}>
            Login
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="px-8 pb-8 space-y-6">
          {/* Mobile Number Field */}
          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-sm font-medium text-gray-700">
              Enter Mobile Number
            </Label>
            <Input
              id="mobile"
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="w-full rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
              placeholder="Enter your mobile number"
              required
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            className="w-full rounded-lg py-5 font-medium text-base transition-all hover:opacity-90"
            style={{ backgroundColor: '#351C75' }}
          >
            Login
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
