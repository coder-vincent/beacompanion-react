import React, { useContext, useEffect, useState, useCallback } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSideBar";
import { SiteHeader } from "@/components/SiteHeader";
import { AppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import axios from "axios";
import toast from "react-hot-toast";

const AdminAbout = () => {
  const { backendUrl } = useContext(AppContext);
  const [aboutContent, setAboutContent] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({ title: "", content: "" });
    setIsEditing(false);
    setEditingContent(null);
  };

  const fetchAboutContent = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.get(backendUrl + "/api/content?type=about");
      if (data.success) {
        setAboutContent(data.content);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch content");
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchAboutContent();
  }, [fetchAboutContent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const endpoint = isEditing
        ? backendUrl + `/api/content/${editingContent.id}`
        : backendUrl + "/api/content";

      const method = isEditing ? "put" : "post";
      const { data } = await axios[method](endpoint, {
        ...formData,
        type: "about",
      });

      if (data.success) {
        toast.success(
          `Content ${isEditing ? "updated" : "added"} successfully`
        );
        resetForm();
        fetchAboutContent();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (content) => {
    setIsEditing(true);
    setEditingContent(content);
    setFormData({
      title: content.title,
      content: content.content,
    });
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.delete(
        `${backendUrl}/api/content/${contentToDelete.id}`
      );
      if (data.success) {
        toast.success("Content deleted successfully");
        setDeleteDialogOpen(false);
        setContentToDelete(null);
        fetchAboutContent();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete content");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Manage About Content</h1>
                {!isEditing && (
                  <Button onClick={resetForm} disabled={isLoading}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New
                  </Button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {isEditing ? "Edit Content" : "Add New Content"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Title</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                          }
                          className="w-full p-2 border rounded-md mt-1"
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Content</label>
                        <textarea
                          value={formData.content}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              content: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded-md mt-1 h-32"
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        {isEditing && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={resetForm}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button type="submit" disabled={isLoading}>
                          {isLoading
                            ? "Processing..."
                            : isEditing
                            ? "Update"
                            : "Add"}{" "}
                          Content
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </form>

              <div className="space-y-4">
                {aboutContent.map((content) => (
                  <Card key={content.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{content.title}</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(content)}
                            disabled={isLoading}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setContentToDelete(content);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{content.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this content? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setContentToDelete(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAbout;
