"use client";

import { create } from "zustand";

export type ToastVariant = "default" | "error" | "success";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id" | "variant"> & { variant?: ToastVariant }) => void;
  dismiss: (id: number) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (t) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { ...t, id: Date.now() + Math.random(), variant: t.variant ?? "default" },
      ],
    })),
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = {
  info: (title: string, description?: string) =>
    useToast.getState().push({ title, description, variant: "default" }),
  error: (title: string, description?: string) =>
    useToast.getState().push({ title, description, variant: "error" }),
  success: (title: string, description?: string) =>
    useToast.getState().push({ title, description, variant: "success" }),
};
