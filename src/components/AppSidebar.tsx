
import { Home, Package, BarChart3, Settings, User, Bell } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  {
    title: "Dashboard",
    url: "#",
    icon: Home,
  },
  {
    title: "Products",
    url: "#",
    icon: Package,
  },
  {
    title: "Analytics",
    url: "#",
    icon: BarChart3,
  },
  {
    title: "Notifications",
    url: "#",
    icon: Bell,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

interface AppSidebarProps {
  userData?: { email: string; name: string } | null;
}

export function AppSidebar({ userData }: AppSidebarProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">GroceryTrack</h2>
            <p className="text-xs text-gray-500">Smart Inventory</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
          <Avatar className="w-8 h-8">
            <AvatarFallback>
              {userData ? getInitials(userData.name) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {userData?.name || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {userData?.email || "user@example.com"}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
