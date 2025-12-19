import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef, ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import noRecordsImage from "@/assets/no_records.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

const AUTH_TOKEN =
  "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhY2wiOiJhZG1pbiIsImV4cCI6MTkwMDY1MzE0M30.asYhgMAOvrau4G6LI4V4IbgYZ022g_GX0qZxaS57GQc";

type ReportType =
  | "product_stock"
  | "order_product_transaction"
  | "order_tray_transaction"
  | "tray_transaction"
  | "rack_transaction"
  | "order_failure_transaction";

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "N/A";
  try {
    return format(new Date(value), "dd-MM-yyyy HH:mm");
  } catch {
    return value;
  }
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "N/A";
  try {
    return format(new Date(value), "dd-MM-yyyy");
  } catch {
    return value;
  }
};

const Reports = () => {
  useAuthSession();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const robotId = searchParams.get("robot_id") || "AMSSTORES1-Nano";

  const [reportType, setReportType] = useState<ReportType>("product_stock");
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [occupiedPercent, setOccupiedPercent] = useState(0);
  const gridApiRef = useRef<any>(null);

  const reportLabels: Record<ReportType, string> = {
    product_stock: "Product Stock Report",
    order_product_transaction: "Order Product Transaction",
    order_tray_transaction: "Order Tray Transaction",
    tray_transaction: "Tray Transaction",
    rack_transaction: "Rack Transaction",
    order_failure_transaction: "Order Failure Transaction",
  };

  // Product Stock Report: Transaction Date, Receive Date, Item Id, Stock, Tray ID, Tray Weight(Kg), Item Description
  const productStockColumns: ColDef[] = [
    {
      field: "updated_at",
      headerName: "Transaction Date",
      flex: 1,
      minWidth: 140,
      valueFormatter: (p) => formatDateTime(p.value),
    },
    {
      field: "created_at",
      headerName: "Receive Date",
      flex: 1,
      minWidth: 110,
      valueFormatter: (p) => formatDate(p.value),
    },
    { field: "item_id", headerName: "Item Id", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "item_quantity", headerName: "Stock", flex: 0.6, minWidth: 70, valueFormatter: (p) => p.value ?? 0 },
    { field: "tray_id", headerName: "Tray ID", flex: 1, minWidth: 110, valueFormatter: (p) => p.value ?? "N/A" },
    {
      field: "tray_weight",
      headerName: "Tray Weight(Kg)",
      flex: 0.9,
      minWidth: 120,
      valueFormatter: (p) => (p.value ? (p.value / 1000).toFixed(2) : "N/A"),
    },
    {
      field: "item_description",
      headerName: "Item Description",
      flex: 1.5,
      minWidth: 180,
      valueFormatter: (p) => p.value ?? "N/A",
    },
  ];

  // Order Product Transaction: Transaction Date, Activity Type, Order Id, User Id, User Name, User Phone, Tray ID, Item Id, Item Processed Quantity
  const orderProductColumns: ColDef[] = [
    {
      field: "updated_at",
      headerName: "Transaction Date",
      flex: 1,
      minWidth: 140,
      valueFormatter: (p) => formatDateTime(p.value),
    },
    {
      field: "transaction_type",
      headerName: "Activity Type",
      flex: 0.8,
      minWidth: 100,
      valueFormatter: (p) => p.value ?? "N/A",
    },
    { field: "order_id", headerName: "Order Id", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "user_id", headerName: "User Id", flex: 0.8, minWidth: 90, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "user_name", headerName: "User Name", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "user_phone", headerName: "User Phone", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "tray_id", headerName: "Tray ID", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "item_id", headerName: "Item Id", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    {
      field: "picked_count",
      headerName: "Item Processed Quantity",
      flex: 1,
      minWidth: 160,
      valueFormatter: (p) => p.value ?? 0,
    },
  ];

  // Order Tray Transaction: Transaction Date, Order Id, Status, Tray ID, Station, Item Id, Item Order Quantity, Order Ref Id
  const orderTrayColumns: ColDef[] = [
    {
      field: "created_at",
      headerName: "Transaction Date",
      flex: 1,
      minWidth: 140,
      valueFormatter: (p) => formatDateTime(p.value),
    },
    { field: "order_id", headerName: "Order Id", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "task_status", headerName: "Status", flex: 0.8, minWidth: 90, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "tray_id", headerName: "Tray ID", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "station_name", headerName: "Station", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "item_id", headerName: "Item Id", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    {
      field: "item_order_quantity",
      headerName: "Item Order Quantity",
      flex: 1,
      minWidth: 140,
      valueFormatter: (p) => p.value ?? 0,
    },
    {
      field: "order_ref_id",
      headerName: "Order Ref Id",
      flex: 1,
      minWidth: 100,
      valueFormatter: (p) => p.value ?? "N/A",
    },
  ];

  // Tray Transaction: Transaction Date, Tray Id, Tray Status, Division, Tray Weight(Kg), Tray Height, Number of Items, Total Available Quantity, Has Item
  const trayTransactionColumns: ColDef[] = [
    {
      field: "updated_at",
      headerName: "Transaction Date",
      flex: 1,
      minWidth: 140,
      valueFormatter: (p) => formatDateTime(p.value),
    },
    { field: "tray_id", headerName: "Tray Id", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    {
      field: "tray_status",
      headerName: "Tray Status",
      flex: 0.8,
      minWidth: 90,
      valueFormatter: (p) => p.value ?? "N/A",
    },
    { field: "tray_divider", headerName: "Division", flex: 0.6, minWidth: 80, valueFormatter: (p) => p.value ?? 0 },
    {
      field: "tray_weight",
      headerName: "Tray Weight(Kg)",
      flex: 0.9,
      minWidth: 120,
      valueFormatter: (p) => (p.value ? (p.value / 1000).toFixed(2) : "N/A"),
    },
    {
      field: "tray_height",
      headerName: "Tray Height",
      flex: 0.7,
      minWidth: 90,
      valueFormatter: (p) => p.value ?? "N/A",
    },
    {
      field: "number_of_items",
      headerName: "Number of Items",
      flex: 0.9,
      minWidth: 120,
      valueFormatter: (p) => p.value ?? 0,
    },
    {
      field: "total_available_quantity",
      headerName: "Total Available Quantity",
      flex: 1,
      minWidth: 160,
      valueFormatter: (p) => p.value ?? 0,
    },
    {
      field: "has_item",
      headerName: "Has Item",
      flex: 0.6,
      minWidth: 80,
      valueFormatter: (p) => (p.value ? "Yes" : "No"),
    },
  ];

  // Rack Transaction: Transaction Date, Rack, Occupied Slots, Free Slots, Rack Occupancy In %
  const rackTransactionColumns: ColDef[] = [
    {
      field: "updated_at",
      headerName: "Transaction Date",
      flex: 1,
      minWidth: 140,
      valueFormatter: (p) => formatDateTime(p.value),
    },
    { field: "rack", headerName: "Rack", flex: 0.8, minWidth: 80, valueFormatter: (p) => p.value ?? "N/A" },
    {
      field: "occupied_slots",
      headerName: "Occupied Slots",
      flex: 1,
      minWidth: 120,
      valueFormatter: (p) => p.value ?? 0,
    },
    { field: "free_slots", headerName: "Free Slots", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? 0 },
    {
      field: "rack_occupancy_percent",
      headerName: "Rack Occupancy In %",
      flex: 1,
      minWidth: 150,
      valueFormatter: (p) => (p.value !== undefined ? `${Number(p.value).toFixed(2)}%` : "N/A"),
    },
  ];

  // Order Failure Transaction: Transaction Date, Order Id, Activity, Item ID, Movement Type, Order Type, Item Order Quantity, Message
  const orderFailureColumns: ColDef[] = [
    {
      field: "created_at",
      headerName: "Transaction Date",
      flex: 1,
      minWidth: 140,
      valueFormatter: (p) => formatDateTime(p.value),
    },
    { field: "order_id", headerName: "Order Id", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "activity", headerName: "Activity", flex: 0.8, minWidth: 90, valueFormatter: (p) => p.value ?? "N/A" },
    { field: "item_id", headerName: "Item ID", flex: 1, minWidth: 100, valueFormatter: (p) => p.value ?? "N/A" },
    {
      field: "movement_type",
      headerName: "Movement Type",
      flex: 1,
      minWidth: 120,
      valueFormatter: (p) => p.value ?? "N/A",
    },
    {
      field: "order_type",
      headerName: "Order Type",
      flex: 0.8,
      minWidth: 100,
      valueFormatter: (p) => p.value ?? "N/A",
    },
    {
      field: "item_order_quantity",
      headerName: "Item Order Quantity",
      flex: 1,
      minWidth: 140,
      valueFormatter: (p) => p.value ?? 0,
    },
    { field: "message", headerName: "Message", flex: 1.5, minWidth: 180, valueFormatter: (p) => p.value ?? "N/A" },
  ];

  const getColumnsForReport = (type: ReportType): ColDef[] => {
    switch (type) {
      case "product_stock":
        return productStockColumns;
      case "order_product_transaction":
        return orderProductColumns;
      case "order_tray_transaction":
        return orderTrayColumns;
      case "tray_transaction":
        return trayTransactionColumns;
      case "rack_transaction":
        return rackTransactionColumns;
      case "order_failure_transaction":
        return orderFailureColumns;
      default:
        return productStockColumns;
    }
  };

  // Aggregate slots by rack number for Rack Transaction report
  const aggregateSlotsByRack = (slots: any[]) => {
    const rackMap: Record<number, { total: number; occupied: number; updated_at: string }> = {};

    slots.forEach((slot) => {
      const rackNum = slot.rack;
      if (rackNum === undefined || rackNum === null) return;

      if (!rackMap[rackNum]) {
        rackMap[rackNum] = { total: 0, occupied: 0, updated_at: slot.updated_at || "" };
      }
      rackMap[rackNum].total++;
      if (slot.tray_id) {
        rackMap[rackNum].occupied++;
      }
      if (slot.updated_at && slot.updated_at > rackMap[rackNum].updated_at) {
        rackMap[rackNum].updated_at = slot.updated_at;
      }
    });

    return Object.entries(rackMap)
      .map(([rackNum, data]) => ({
        rack: Number(rackNum),
        occupied_slots: data.occupied,
        free_slots: data.total - data.occupied,
        rack_occupancy_percent: data.total > 0 ? (data.occupied / data.total) * 100 : 0,
        updated_at: data.updated_at,
      }))
      .sort((a, b) => a.rack - b.rack);
  };

  const fetchOccupiedPercent = useCallback(async () => {
    try {
      const [slotsResponse, occupiedResponse] = await Promise.all([
        fetch("https://amsstores1.leapmile.com/robotmanager/slots?slot_status=active", {
          headers: { Authorization: AUTH_TOKEN, "Content-Type": "application/json" },
        }),
        fetch("https://amsstores1.leapmile.com/nanostore/occupied_trays?occupied=true", {
          headers: { Authorization: AUTH_TOKEN, "Content-Type": "application/json" },
        }),
      ]);

      const slotsData = await slotsResponse.json();
      const occupiedData = await occupiedResponse.json();

      const totalSlots = slotsData.total_count || slotsData.count || 0;
      const occupiedSlots = occupiedData.records?.[0]?.count || 0;
      const percent = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

      setOccupiedPercent(percent);
    } catch (error) {
      console.error("Error fetching occupied percent:", error);
    }
  }, []);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      let records: any[] = [];

      switch (reportType) {
        case "product_stock": {
          // Fetch items and trays, then join to get tray_weight
          const [itemsRes, traysRes] = await Promise.all([
            fetch("https://amsstores1.leapmile.com/nanostore/items", {
              headers: { Authorization: AUTH_TOKEN, "Content-Type": "application/json" },
            }),
            fetch("https://amsstores1.leapmile.com/robotmanager/trays", {
              headers: { Authorization: AUTH_TOKEN, "Content-Type": "application/json" },
            }),
          ]);
          const itemsData = await itemsRes.json();
          const traysData = await traysRes.json();

          // Create tray lookup map
          const trayMap: Record<string, any> = {};
          (traysData.records || []).forEach((tray: any) => {
            trayMap[tray.tray_id] = tray;
          });

          // Join items with tray data
          records = (itemsData.records || []).map((item: any) => ({
            ...item,
            tray_weight: trayMap[item.tray_id]?.tray_weight || null,
          }));
          break;
        }

        case "order_product_transaction": {
          const res = await fetch("https://amsstores1.leapmile.com/nanostore/items/usage?order_by=DESC", {
            headers: { Authorization: AUTH_TOKEN, "Content-Type": "application/json" },
          });
          const data = await res.json();
          records = data.records || [];
          break;
        }

        case "order_tray_transaction": {
          const res = await fetch("https://amsstores1.leapmile.com/robotmanager/task", {
            headers: { Authorization: AUTH_TOKEN, "Content-Type": "application/json" },
          });
          const data = await res.json();
          records = data.records || [];
          break;
        }

        case "tray_transaction": {
          // Fetch trays and items, then compute number_of_items and total_available_quantity
          const [traysRes, itemsRes] = await Promise.all([
            fetch("https://amsstores1.leapmile.com/robotmanager/trays", {
              headers: { Authorization: AUTH_TOKEN, "Content-Type": "application/json" },
            }),
            fetch("https://amsstores1.leapmile.com/nanostore/items", {
              headers: { Authorization: AUTH_TOKEN, "Content-Type": "application/json" },
            }),
          ]);
          const traysData = await traysRes.json();
          const itemsData = await itemsRes.json();

          // Group items by tray_id
          const trayItemsMap: Record<string, { count: number; totalQty: number }> = {};
          (itemsData.records || []).forEach((item: any) => {
            if (!item.tray_id) return;
            if (!trayItemsMap[item.tray_id]) {
              trayItemsMap[item.tray_id] = { count: 0, totalQty: 0 };
            }
            trayItemsMap[item.tray_id].count++;
            trayItemsMap[item.tray_id].totalQty += item.item_quantity || 0;
          });

          // Join trays with computed fields
          records = (traysData.records || []).map((tray: any) => ({
            ...tray,
            number_of_items: trayItemsMap[tray.tray_id]?.count || 0,
            total_available_quantity: trayItemsMap[tray.tray_id]?.totalQty || 0,
            has_item: (trayItemsMap[tray.tray_id]?.count || 0) > 0,
          }));
          break;
        }

        case "rack_transaction": {
          const res = await fetch("https://amsstores1.leapmile.com/robotmanager/slots", {
            headers: { Authorization: AUTH_TOKEN, "Content-Type": "application/json" },
          });
          const data = await res.json();
          records = aggregateSlotsByRack(data.records || []);
          break;
        }

        case "order_failure_transaction": {
          const res = await fetch("https://amsstores1.leapmile.com/robotmanager/task?task_status=failed", {
            headers: { Authorization: AUTH_TOKEN, "Content-Type": "application/json" },
          });
          const data = await res.json();
          records = data.records || [];
          break;
        }
      }

      console.log(`Fetched ${reportType}:`, records.length);
      setRowData(records);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
      console.error("Error fetching report data:", error);
      setRowData([]);
    } finally {
      setLoading(false);
    }
  }, [reportType, toast]);

  useEffect(() => {
    const storedUserName = localStorage.getItem("user_name");
    const storedUserId = localStorage.getItem("user_id");

    if (!storedUserName || !storedUserId) {
      navigate("/");
      return;
    }

    fetchOccupiedPercent();
  }, [navigate, fetchOccupiedPercent]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleRefresh = () => {
    fetchReportData();
    fetchOccupiedPercent();
  };

  const handleDownload = () => {
    if (rowData.length === 0) {
      toast({ title: "No Data", description: "No data available to download", variant: "destructive" });
      return;
    }

    const columns = getColumnsForReport(reportType);
    const headers = columns.map((col) => col.headerName).join(",");
    const rows = rowData
      .map((row) =>
        columns
          .map((col) => {
            const field = col.field as string;
            let value = row[field];
            if (field.includes("_at")) {
              value = value ? formatDateTime(value) : "N/A";
            }
            if (field === "tray_weight") {
              value = value ? (value / 1000).toFixed(2) : "N/A";
            }
            if (field === "rack_occupancy_percent") {
              value = value !== undefined ? `${Number(value).toFixed(2)}%` : "N/A";
            }
            if (field === "has_item") {
              value = value ? "Yes" : "No";
            }
            return `"${value ?? "N/A"}"`;
          })
          .join(","),
      )
      .join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportLabels[reportType].replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fafafa" }}>
      <AppHeader selectedTab="reports" isReportsPage={true} />

      <main className="p-2 sm:p-4">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
              <SelectTrigger className="w-full sm:w-[280px] bg-white border-gray-300">
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-300 z-50">
                <SelectItem value="product_stock">Product Stock Report</SelectItem>
                <SelectItem value="order_product_transaction">Order Product Transaction</SelectItem>
                <SelectItem value="order_tray_transaction">Order Tray Transaction</SelectItem>
                <SelectItem value="tray_transaction">Tray Transaction</SelectItem>
                <SelectItem value="rack_transaction">Rack Transaction</SelectItem>
                <SelectItem value="order_failure_transaction">Order Failure Transaction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-blue-50 px-3 py-1.5 rounded text-sm whitespace-nowrap">
              Occupied: <span className="font-semibold text-blue-600">{occupiedPercent.toFixed(1)}%</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="bg-white">
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={loading || rowData.length === 0}
              className="bg-white"
            >
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>

        {/* Data Grid */}
        {!loading && rowData.length === 0 ? (
          <div className="flex justify-center items-center" style={{ height: "calc(100vh - 180px)" }}>
            <img src={noRecordsImage} alt="No records found" className="w-48 sm:w-[340px]" />
          </div>
        ) : (
          <div className="ag-theme-quartz w-full" style={{ height: "calc(100vh - 145px)" }}>
            <AgGridReact
              rowData={rowData}
              columnDefs={getColumnsForReport(reportType)}
              defaultColDef={{
                resizable: true,
                minWidth: 80,
                sortable: true,
                filter: true,
              }}
              pagination={true}
              paginationPageSize={50}
              paginationPageSizeSelector={[25, 50, 100, 200]}
              rowHeight={35}
              enableCellTextSelection={true}
              ensureDomOrder={true}
              onGridReady={(params) => {
                gridApiRef.current = params.api;
                params.api.sizeColumnsToFit();
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
