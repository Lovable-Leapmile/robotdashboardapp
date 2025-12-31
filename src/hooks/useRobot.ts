import { useState, useEffect, useCallback } from "react";
import { getRobotManagerBase } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";
import { isApiConfigured } from "@/lib/apiConfig";

export interface RobotInfo {
  robot_name: string;
  robot_num_rows?: number;
  robot_num_racks?: number;
  robot_num_slots?: number;
  robot_num_depths?: number;
  [key: string]: any;
}

interface UseRobotResult {
  robots: RobotInfo[];
  currentRobot: RobotInfo | null;
  robotName: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  selectRobot: (robotName: string) => void;
}

const ROBOT_STORAGE_KEY = "selected_robot_name";

export const useRobot = (): UseRobotResult => {
  const [robots, setRobots] = useState<RobotInfo[]>([]);
  const [currentRobot, setCurrentRobot] = useState<RobotInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRobots = useCallback(async () => {
    if (!isApiConfigured()) {
      setError("API not configured");
      return;
    }

    const token = getStoredAuthToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getRobotManagerBase()}/robots`, {
        method: "GET",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch robot data");
      }

      const data = await response.json();
      const robotRecords: RobotInfo[] = data.records || [];
      
      setRobots(robotRecords);

      if (robotRecords.length > 0) {
        // Check for previously selected robot
        const savedRobotName = localStorage.getItem(ROBOT_STORAGE_KEY);
        const savedRobot = savedRobotName 
          ? robotRecords.find(r => r.robot_name === savedRobotName)
          : null;
        
        // Use saved robot or default to first one
        const selectedRobot = savedRobot || robotRecords[0];
        setCurrentRobot(selectedRobot);
        localStorage.setItem(ROBOT_STORAGE_KEY, selectedRobot.robot_name);
      } else {
        setCurrentRobot(null);
        setError("No robots found");
      }
    } catch (err) {
      console.error("Error fetching robots:", err);
      setError(err instanceof Error ? err.message : "Failed to load robot data");
      setRobots([]);
      setCurrentRobot(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectRobot = useCallback((robotName: string) => {
    const robot = robots.find(r => r.robot_name === robotName);
    if (robot) {
      setCurrentRobot(robot);
      localStorage.setItem(ROBOT_STORAGE_KEY, robotName);
    }
  }, [robots]);

  useEffect(() => {
    fetchRobots();
  }, [fetchRobots]);

  return {
    robots,
    currentRobot,
    robotName: currentRobot?.robot_name ?? null,
    isLoading,
    error,
    refetch: fetchRobots,
    selectRobot,
  };
};

// Utility function to get stored robot name synchronously (for non-hook contexts)
export const getStoredRobotName = (): string | null => {
  return localStorage.getItem(ROBOT_STORAGE_KEY);
};

// Utility function to build PubSub topic from API name and robot name
export const buildPubSubTopic = (robotName: string): string => {
  // Extract the API name prefix from the robot name or use a default pattern
  // The topic format seems to be: {apiPrefix}_{robotName}
  const apiNameMatch = robotName.match(/^([A-Za-z0-9]+)/);
  const apiPrefix = apiNameMatch ? apiNameMatch[1].toLowerCase() : robotName.toLowerCase().split('-')[0];
  return `${apiPrefix}_${robotName}`;
};
