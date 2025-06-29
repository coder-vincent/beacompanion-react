import React, { useContext, useEffect, useState, useCallback } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSideBar";
import { SiteHeader } from "@/components/SiteHeader";
import { AppContext } from "@/context/AppContext";

import axios from "axios";
import toast from "react-hot-toast";
import About from "@/components/About";

const PatientAbout = () => {
  const { backendUrl } = useContext(AppContext);
  const [aboutContent, setAboutContent] = useState([]);

  const fetchAboutContent = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/content?type=about");
      if (data.success) {
        setAboutContent(data.content);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to fetch about content"
      );
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchAboutContent();
  }, [fetchAboutContent]);

  return (
    <div className="min-h-screen flex flex-col">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <About aboutContent={aboutContent} />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default PatientAbout;
