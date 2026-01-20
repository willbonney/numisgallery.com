import { useMantineColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ClientResponseError } from "pocketbase";
import { useCallback, useEffect, useRef, useState } from "react";
import pb from "../lib/pocketbase";

type Theme = "light" | "dark" | "auto";
type SortOption =
  | "country"
  | "countryDesc"
  | "grade"
  | "gradeDesc"
  | "year"
  | "yearDesc"
  | "faceValue"
  | "faceValueDesc"
  | "dateAdded"
  | "dateAddedDesc";

type UserSettings = {
  id: string;
  userId: string;
  theme: Theme;
  gallerySort?: SortOption;
  filterCountry?: string[];
  filterGrade?: string[];
  created: string;
  updated: string;
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { setColorScheme } = useMantineColorScheme();

  // Store the latest setColorScheme in a ref to avoid dependency issues
  const setColorSchemeRef = useRef(setColorScheme);
  setColorSchemeRef.current = setColorScheme;

  // Apply theme to Mantine (uses ref instead of depending on setColorScheme)
  const applyTheme = useCallback(
    (theme: Theme) => {
      if (theme === "auto") {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        setColorSchemeRef.current(prefersDark ? "dark" : "light");
      } else {
        setColorSchemeRef.current(theme);
      }
    },
    [] // No dependencies - this function is now stable
  );
  // Load settings from PocketBase
  const loadSettings = useCallback(async () => {
    const userId = pb.authStore.record?.id;
    if (!userId) {
      // For unauthenticated users, check localStorage for theme preference
      const savedTheme = localStorage.getItem("themePreference");
      if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
        setColorSchemeRef.current(savedTheme);
      }
      setLoading(false);
      return;
    }

    try {
      // Try to fetch existing settings
      const records = await pb
        .collection("user_settings")
        .getFullList<UserSettings>({
          filter: `userId="${userId}"`,
        });

      if (records.length > 0) {
        const userSettings = records[0];
        setSettings(userSettings);
        applyTheme(userSettings.theme);
      } else {
        // Create default settings if none exist
        // Check localStorage for theme preference, default to 'auto'
        const savedTheme = localStorage.getItem("themePreference");
        const initialTheme =
          savedTheme === "light" ||
          savedTheme === "dark" ||
          savedTheme === "auto"
            ? (savedTheme as Theme)
            : "auto";

        const newSettings = await pb
          .collection("user_settings")
          .create<UserSettings>({
            userId: userId,
            theme: initialTheme,
            gallerySort: "country",
            filterCountry: [],
            filterGrade: [],
          });
        setSettings(newSettings);
        applyTheme(initialTheme);
        // Clear localStorage preference since it's now in the database
        localStorage.removeItem("themePreference");
      }
    } catch (error: unknown) {
      // Handle 403 Forbidden and 400 Bad Request errors gracefully
      // 403: collection may not be accessible
      // 400: collection may not exist (not created via migrations yet)
      if (
        (error as ClientResponseError)?.status === 403 ||
        (error as ClientResponseError)?.status === 400
      ) {
        console.debug(
          "Settings collection not accessible or not found (403/400)"
        );
      } else {
        console.error("Failed to load settings:", error);
      }
      // Apply default theme and continue - settings are not critical
      applyTheme("auto");
    } finally {
      setLoading(false);
    }
  }, [applyTheme]); // Only depends on stable applyTheme

  // Update theme preference
  const updateTheme = useCallback(
    async (newTheme: string) => {
      if (!settings?.id) return;

      try {
        const updatedSettings = await pb
          .collection("user_settings")
          .update<UserSettings>(settings.id, {
            theme: newTheme,
          });
        setSettings(updatedSettings);
        applyTheme(newTheme as Theme);

        notifications.show({
          title: "Theme Updated",
          message: `Theme changed to ${newTheme}`,
          color: "green",
        });
      } catch (error: unknown) {
        // Handle 403 Forbidden and 400 Bad Request errors gracefully
        if (
          (error as ClientResponseError)?.status === 403 ||
          (error as ClientResponseError)?.status === 400
        ) {
          console.debug(
            "Settings collection not accessible or not found (403/400)"
          );
          applyTheme(newTheme as Theme);
          return;
        }
        console.error("Failed to update theme:", error);
        notifications.show({
          title: "Error",
          message: "Failed to update theme preference",
          color: "red",
        });
      }
    },
    [settings, applyTheme]
  );

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (settings?.theme !== "auto") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setColorScheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings?.theme, setColorScheme]);

  // Update gallery settings (sort and filters)
  const updateGallerySettings = useCallback(
    async (updates: {
      gallerySort?: SortOption;
      filterCountry?: string[];
      filterGrade?: string[];
    }) => {
      if (!settings?.id) return;

      try {
        const updatedSettings = await pb
          .collection("user_settings")
          .update<UserSettings>(settings.id, updates);
        setSettings(updatedSettings);
      } catch (error: unknown) {
        // Handle 403 Forbidden and 400 Bad Request errors gracefully
        if (
          (error as ClientResponseError)?.status === 403 ||
          (error as ClientResponseError)?.status === 400
        ) {
          console.debug(
            "Settings collection not accessible or not found (403/400)"
          );
          return;
        }
        console.error("Failed to update gallery settings:", error);
      }
    },
    [settings]
  );

  return {
    settings,
    loading,
    updateTheme,
    updateGallerySettings,
    reload: loadSettings,
  };
}
