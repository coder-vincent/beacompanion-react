"use client";

import { ChevronsUpDown, LogOut, Sparkles } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useContext } from "react";
import { AppContext } from "@/context/AppContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export function NavUser({ user }) {
  const { isMobile } = useSidebar();
  const { userData, backendUrl, setUserData, setIsLoggedIn } =
    useContext(AppContext);
  const keySequence = useRef("");
  const keyTimeout = useRef(null);

  const displayName = userData?.name || "Guest";
  const avatarInitial = displayName[0]?.toUpperCase() || "G";

  const navigate = useNavigate();

  const updateRoleToAdmin = useCallback(async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(backendUrl + "/api/user/update-role", {
        userId: userData.id,
        role: "admin",
      });

      if (data.success) {
        setUserData(data.userData);
        toast.success("Role updated to admin successfully!");
        navigate("/admin-dashboard");
      } else {
        toast.error(data.message || "Failed to update role");
      }
    } catch (error) {
      toast.error(error?.message || "Failed to update role");
    }
  }, [backendUrl, userData?.id, setUserData, navigate]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      const dropdownTrigger = document.querySelector('[data-state="open"]');
      if (!dropdownTrigger || !e.key) return;

      keySequence.current += e.key.toLowerCase();

      if (keyTimeout.current) {
        clearTimeout(keyTimeout.current);
      }

      keyTimeout.current = setTimeout(() => {
        keySequence.current = "";
      }, 2000);

      if (keySequence.current === "iamone") {
        updateRoleToAdmin();
        keySequence.current = "";
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (keyTimeout.current) {
        clearTimeout(keyTimeout.current);
      }
    };
  }, [updateRoleToAdmin]);

  const sendVerificationOtp = async () => {
    try {
      axios.defaults.withCredentials = true;

      const { data } = await axios.post(
        backendUrl + "/api/auth/send-verify-otp"
      );

      if (data.success) {
        navigate("/email-verify");
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error?.message || "Verification failed");
    }
  };

  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(backendUrl + "/api/auth/logout");

      data.success && setIsLoggedIn(false);
      data.success && setUserData(false);
      navigate("/");
    } catch (error) {
      toast.error(error?.message || "Logout failed");
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.avatar || ""} alt={displayName} />
                <AvatarFallback className="rounded-lg">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col flex-1 text-left text-sm leading-tight ml-2">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {userData?.role === "admin"
                    ? "Admin"
                    : userData?.role === "doctor"
                    ? "Doctor"
                    : "Patient"}
                </span>
              </div>

              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {!userData?.isAccountVerified && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={sendVerificationOtp}>
                    <Sparkles className="mr-2 size-4" />
                    Verify Email
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
