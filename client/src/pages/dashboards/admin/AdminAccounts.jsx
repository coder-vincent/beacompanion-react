import { AppSidebar } from "@/components/AppSideBar";
import { SiteHeader } from "@/components/SiteHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import React, { useEffect, useState, useContext, useCallback } from "react";
import axios from "axios";
import { AppContext } from "@/context/AppContext";
import toast from "react-hot-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { io } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const AdminAccounts = () => {
  axios.defaults.withCredentials = true;

  const { userData, backendUrl } = useContext(AppContext);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });

  const [newAccountFormData, setNewAccountFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient", // Default role for new accounts
  });

  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.get(backendUrl + "/api/user/all");
      if (data.success) {
        setUsers(data.users);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchUsers();

    const socket = io(backendUrl, { withCredentials: true });

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    socket.on("userListUpdate", () => {
      console.log("Received userListUpdate event");
      fetchUsers();
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
    });

    return () => {
      socket.disconnect();
    };
  }, [backendUrl, fetchUsers]);

  const handleUpdate = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.post(
        backendUrl + "/api/user/update-account",
        {
          userId: selectedUser.id,
          ...formData,
        }
      );

      if (data.success) {
        setUsers(
          users.map((user) =>
            user.id === selectedUser.id
              ? { ...user, ...formData, password: undefined }
              : user
          )
        );

        toast.success("Account updated successfully");
        setIsUpdateDialogOpen(false);

        if (selectedUser.id === userData?.id) {
          if (formData.role === "admin") {
            navigate("/admin-dashboard");
          } else if (formData.role === "doctor") {
            navigate("/doctor-dashboard");
          } else if (formData.role === "patient") {
            navigate("/patient-dashboard");
          }
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || "Failed to update account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      axios.defaults.withCredentials = true;
      setIsLoading(true);
      const { data } = await axios.delete(
        backendUrl + "/api/user/delete-account",
        {
          data: { userId: selectedUser.id },
        }
      );

      if (data.success) {
        setUsers(users.filter((user) => user.id !== selectedUser.id));

        toast.success("Account deleted successfully");
        setIsDeleteDialogOpen(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.post(
        backendUrl + "/api/user/create-by-admin",
        {
          ...newAccountFormData,
        }
      );

      if (data.success) {
        toast.success("Account created successfully");
        setUsers([...users, { ...data.user, password: undefined }]);
        setIsAddDialogOpen(false);
        setNewAccountFormData({
          name: "",
          email: "",
          password: "",
          role: "patient",
        });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const openUpdateDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setIsUpdateDialogOpen(true);
  };

  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset className="flex flex-1 flex-col p-4 md:p-8">
            <div className="flex flex-1 flex-col gap-6 md:gap-8">
              <div className="rounded-xl border bg-card p-4 md:p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Manage Accounts</h2>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    Add Account
                  </Button>
                </div>
                <div className="mb-4">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="mb-4 text-sm text-muted-foreground">
                  Total users: {users.length}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[100px]">Role</TableHead>
                      <TableHead className="w-[100px] text-center">
                        Verified
                      </TableHead>
                      <TableHead className="w-[150px] text-center">
                        Created At
                      </TableHead>
                      <TableHead className="w-[150px] text-center">
                        Last Updated
                      </TableHead>
                      <TableHead className="w-[150px] text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <svg
                              className="animate-spin h-5 w-5 text-gray-500 mr-3"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Loading users...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No user accounts found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users
                        .filter((user) => {
                          const searchLower = searchTerm.toLowerCase();
                          return (
                            user.name.toLowerCase().includes(searchLower) ||
                            user.email.toLowerCase().includes(searchLower)
                          );
                        })
                        .map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.name}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell className="capitalize">
                              <Badge
                                variant={
                                  user.role === "admin"
                                    ? "destructive"
                                    : user.role === "doctor"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {user.isAccountVerified ? "Yes" : "No"}
                            </TableCell>
                            <TableCell className="text-center">
                              {new Date(user.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              {new Date(user.updatedAt).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              {userData.isAccountVerified ? (
                                <div className="flex gap-2 justify-center">
                                  {user.id === userData?.id ||
                                  user.role === "admin" ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openUpdateDialog(user)}
                                    >
                                      Edit Profile
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openUpdateDialog(user)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => openDeleteDialog(user)}
                                      >
                                        Delete
                                      </Button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <p>Not Allowed</p>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>

      {/* Update Account Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-6">
          <DialogHeader>
            <DialogTitle>Update Account</DialogTitle>
            <DialogDescription>
              Make changes to the user account here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 space-y-2">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password">
                Password (leave blank to keep current)
              </label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="role">Role</label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsUpdateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-6">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this account? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
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

      {/* Add Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-6">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Fill in the details for the new user account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 space-y-2">
            <div className="grid gap-2">
              <label htmlFor="newName" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="newName"
                value={newAccountFormData.name}
                onChange={(e) =>
                  setNewAccountFormData({
                    ...newAccountFormData,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="newEmail">Email</label>
              <Input
                id="newEmail"
                type="email"
                value={newAccountFormData.email}
                onChange={(e) =>
                  setNewAccountFormData({
                    ...newAccountFormData,
                    email: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="newPassword">Password</label>
              <Input
                id="newPassword"
                type="password"
                value={newAccountFormData.password}
                onChange={(e) =>
                  setNewAccountFormData({
                    ...newAccountFormData,
                    password: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="newRole">Role</label>
              <Select
                value={newAccountFormData.role}
                onValueChange={(value) =>
                  setNewAccountFormData({ ...newAccountFormData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAccount} disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAccounts;
