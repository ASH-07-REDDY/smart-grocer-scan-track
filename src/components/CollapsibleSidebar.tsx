
import { useState } from "react";
import { Home, Package, BarChart3, Settings, User, Bell, Menu, X, LogOut, Scale, ChefHat, Apple, Trash2, Trophy } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    url: "dashboard",
    icon: Home,
  },
  {
    title: "Products",
    url: "products",
    icon: Package,
  },
  {
    title: "Analytics",
    url: "analytics",
    icon: BarChart3,
  },
  {
    title: "Weight Monitor",
    url: "weight-monitor",
    icon: Scale,
  },
  {
    title: "Recipe Suggestions",
    url: "recipes",
    icon: ChefHat,
  },
  {
    title: "Nutritional Info",
    url: "nutrition",
    icon: Apple,
  },
  {
    title: "Waste Tracking",
    url: "waste",
    icon: Trash2,
  },
  {
    title: "Gamification",
    url: "gamification",
    icon: Trophy,
  },
  {
    title: "Notifications",
    url: "notifications",
    icon: Bell,
  },
  {
    title: "Settings",
    url: "settings",
    icon: Settings,
  },
];

interface CollapsibleSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
}

export function CollapsibleSidebar({ isOpen, onToggle, currentView, onViewChange }: CollapsibleSidebarProps) {
  const { user, signOut } = useAuth();

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || "U";
  };

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";
  };

  return (
    <>
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={onToggle}>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  <img src="/lovable-uploads/6f512ac0-96f5-409c-84c5-139ea4c60396.png" alt="Smart Pantry Logo" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Smart Pantry</h2>
                  <p className="text-xs text-gray-500">Smart Inventory</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onToggle}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Menu</p>
              {menuItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => onViewChange(item.url)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors w-full text-left",
                    currentView === item.url && "bg-gray-100 font-medium"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  {getInitials(getUserName())}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {getUserName()}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || "user@example.com"}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut}
              className="w-full justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Menu toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className={cn(
          "fixed top-4 left-4 z-40 transition-transform duration-300",
          isOpen && "translate-x-64"
        )}
      >
        <Menu className="w-4 h-4" />
      </Button>
    </>
  );
}
