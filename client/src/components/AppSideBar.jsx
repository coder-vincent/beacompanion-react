"use client";

import React, { useContext, useEffect } from "react";
import {
  BookOpen,
  SquareLibrary,
  LayoutDashboard,
  MessageCircleQuestion,
  Users,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { NavMain } from "./NavMain";
import { NavUser } from "./NavUser";
import { AppContext } from "@/context/AppContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "@/context/SocketContext";

const getNavItems = (role) => {
  switch (role) {
    case "patient":
      return [
        {
          title: "Dashboard",
          url: "/patient-dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Records",
          url: "/patient-records",
          icon: SquareLibrary,
        },
        {
          title: "About",
          url: "/patient-about",
          icon: BookOpen,
        },
        {
          title: "FAQ",
          url: "/patient-faq",
          icon: MessageCircleQuestion,
        },
      ];
    case "doctor":
      return [
        {
          title: "Dashboard",
          url: "/doctor-dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Patients",
          url: "/doctor-patients",
          icon: Users,
        },
        {
          title: "About",
          url: "/doctor-about",
          icon: BookOpen,
        },
        {
          title: "FAQ",
          url: "/doctor-faq",
          icon: MessageCircleQuestion,
        },
      ];
    case "admin":
      return [
        {
          title: "Dashboard",
          url: "/admin-dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Manage Accounts",
          url: "/admin-accounts",
          icon: Users,
        },
        {
          title: "Manage About",
          url: "/admin-about",
          icon: Settings,
        },
        {
          title: "Manage FAQ",
          url: "/admin-faq",
          icon: Settings,
        },
      ];
    default:
      return null;
  }
};

const getDashboardUrl = (role) => {
  switch (role) {
    case "patient":
      return "/patient-dashboard";
    case "doctor":
      return "/doctor-dashboard";
    case "admin":
      return "/admin-dashboard";
    default:
      return "/";
  }
};

export function AppSidebar(props) {
  const { userData, setUserData } = useContext(AppContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected) {
      // Listen for user data updates
      socket.on("userDataUpdate", (updatedUserData) => {
        if (updatedUserData && updatedUserData.role !== userData?.role) {
          // Navigate to the appropriate dashboard when role changes
          const dashboardUrl = getDashboardUrl(updatedUserData.role);
          navigate(dashboardUrl);
        }
        setUserData(updatedUserData);
      });

      // Clean up socket listener
      return () => {
        socket.off("userDataUpdate");
      };
    }
  }, [socket, isConnected, setUserData, userData?.role, navigate]);

  const navItems = getNavItems(userData?.role)?.map((item) => ({
    ...item,
    isActive: location.pathname === item.url,
  }));

  return (
    <Sidebar
      className="top-[var(--header-height)] h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarContent>
        {navItems && <NavMain items={navItems} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData || { name: "Guest", email: "", avatar: "" }} />
      </SidebarFooter>
    </Sidebar>
  );
}
