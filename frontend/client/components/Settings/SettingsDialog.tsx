import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUserProfile, useUpdateUserPreferences } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Moon, Sun, Bell, BookOpen, User } from "lucide-react";

const DOMAINS_LIST = [
  "LLMs",
  "Agents",
  "RAG",
  "MLOps",
  "Robotics",
  "Vision",
  "Diffusion",
  "Open Source"
];

export function SettingsDialog() {
  const { isOpen, setOpen } = useSettingsStore();
  const { data: profile } = useUserProfile();
  const updatePrefs = useUpdateUserPreferences();

  // Local state initialized from profile or defaults
  const [skillLevel, setSkillLevel] = useState<string>("beginner");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(true);

  // Sync preferences from profile data when it loads or changes
  useEffect(() => {
    if (profile) {
      setSkillLevel(profile.skill_level || "beginner");
      setSelectedDomains(profile.domains || []);
    }
  }, [profile, isOpen]);

  // Sync theme switch state with DOM on mount and open
  useEffect(() => {
    if (isOpen) {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    }
  }, [isOpen]);

  const handleToggleDomain = (domain: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain]
    );
  };

  const handleSave = () => {
    // 1. Save preferences to backend API
    updatePrefs.mutate(
      { skillLevel, domains: selectedDomains },
      {
        onSuccess: () => {
          // 2. Toggle local dark mode
          if (isDarkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
          } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
          }

          toast.success("Preferences updated successfully!");
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-md w-[95vw] rounded-2xl bg-card border border-border shadow-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <span>⚙️</span> App Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Customize your learning profile, difficulty preference, and display settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Skill Level Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground flex items-center gap-2" htmlFor="skill-select">
              <User className="w-4 h-4 text-primary" /> Learning Tier
            </label>
            <select
              id="skill-select"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="w-full bg-secondary/20 border border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-secondary/30 transition-smooth"
            >
              <option value="beginner">Beginner (Concept Intuitions)</option>
              <option value="intermediate">Intermediate (Systems & Implementations)</option>
              <option value="advanced">Advanced (Deep Mathematical Insights)</option>
            </select>
          </div>

          {/* Domain Selection */}
          <div className="space-y-3">
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-secondary" /> Interested Domains
            </span>
            <div className="grid grid-cols-2 gap-2">
              {DOMAINS_LIST.map((domain) => {
                const isChecked = selectedDomains.includes(domain);
                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => handleToggleDomain(domain)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-smooth text-left ${
                      isChecked
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-secondary/10 border-border text-muted-foreground hover:bg-secondary/25 hover:text-foreground"
                    }`}
                  >
                    <span>{domain}</span>
                    <span className="text-sm">{isChecked ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-border" />

          {/* Theme Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                {isDarkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-yellow-500" />}
                Dark Theme
              </span>
              <span className="text-xs text-muted-foreground">Adjust display background</span>
            </div>
            <Switch
              checked={isDarkMode}
              onCheckedChange={setIsDarkMode}
              aria-label="Toggle dark theme"
            />
          </div>

          {/* Daily Notifications Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-secondary" /> Daily Challenge Reminders
              </span>
              <span className="text-xs text-muted-foreground">Simulate notifications on phone</span>
            </div>
            <Switch
              checked={remindersEnabled}
              onCheckedChange={setRemindersEnabled}
              aria-label="Toggle challenge reminders"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={updatePrefs.isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updatePrefs.isPending}
            className="w-full sm:w-auto min-w-[100px]"
          >
            {updatePrefs.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
