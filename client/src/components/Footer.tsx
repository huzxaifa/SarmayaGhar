import { Facebook, Twitter, Linkedin, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center mb-6">
              <img
                src="/sarmayaghar-logo.png"
                alt="SarmayaGhar logo"
                className="h-8 w-auto object-contain mr-3"
              />
              <span className="text-xl font-bold">SarmayaGhar</span>
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed mb-4">
              Pakistan's first ML-powered Real Estate platform. Make smarter property decisions with advanced machine learning.
            </p>
            <div className="flex space-x-4">
              <Button size="sm" variant="ghost" className="bg-white/10 hover:bg-white/20 p-2">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button size="sm" variant="ghost" className="bg-white/10 hover:bg-white/20 p-2">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button size="sm" variant="ghost" className="bg-white/10 hover:bg-white/20 p-2">
                <Linkedin className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Services</h3>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="text-primary-foreground/80 hover:text-white transition-colors">AI Property Valuation</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-white transition-colors">Market Analysis</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-white transition-colors">Portfolio Management</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-white transition-colors">Investment Advisory</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-white transition-colors">Market Predictions</a></li>
            </ul>
          </div>
          
          {/* Markets */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Markets</h3>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="text-primary-foreground/80 hover:text-white transition-colors">Karachi Properties</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-white transition-colors">Lahore Properties</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-white transition-colors">Islamabad Properties</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-white transition-colors">Rawalpindi Properties</a></li>
              <li><a href="#" className="text-primary-foreground/80 hover:text-white transition-colors">Commercial Properties</a></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Contact</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-3 text-primary-foreground/60" />
                <span className="text-primary-foreground/80">huzaifakhalid7c@gmail.com</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-3 text-primary-foreground/60" />
                <span className="text-primary-foreground/80">+92 317 5137945</span>
              </div>
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-3 text-primary-foreground/60 mt-0.5" />
                <span className="text-primary-foreground/80">Karachi, Lahore, Islamabad</span>
              </div>
            </div>
            
            {/* Newsletter */}
            <div className="mt-6">
              <p className="text-sm text-primary-foreground/80 mb-3">Get market updates:</p>
              <div className="flex">
                <Input 
                  type="email" 
                  placeholder="Your email" 
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-primary-foreground/60 text-sm rounded-r-none"
                />
                <Button className="bg-accent hover:bg-accent/90 px-4 py-2 rounded-l-none">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-white/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-primary-foreground/80">
              © 2025 SarmayaGhar. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm text-primary-foreground/80 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
              <a href="#" className="hover:text-white transition-colors">Disclaimer</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
