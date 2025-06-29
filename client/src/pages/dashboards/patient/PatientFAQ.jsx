import React, { useContext, useEffect, useState, useCallback } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSideBar";
import { SiteHeader } from "@/components/SiteHeader";
import { AppContext } from "@/context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import Faq from "@/components/Faq";

const PatientFAQ = () => {
  const { backendUrl } = useContext(AppContext);
  const [faqContent, setFaqContent] = useState([]);

  const fetchFaqContent = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/content?type=faq");
      if (data.success) {
        setFaqContent(data.content);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch FAQ content");
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchFaqContent();
  }, [fetchFaqContent]);

  return (
    <div className="min-h-screen flex flex-col">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <Faq faqContent={faqContent} />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default PatientFAQ;
