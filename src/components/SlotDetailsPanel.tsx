import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

interface SlotDetails {
  slot_id: string;
  slot_name: string;
  slot_status: string;
  slot_height: number;
  tags: string[];
  tray_id: string | null;
  updated_at: string;
}

interface SlotDetailsPanelProps {
  slotDetails: SlotDetails | null;
  isVisible: boolean;
}

const SlotDetailsPanel = ({ slotDetails, isVisible }: SlotDetailsPanelProps) => {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [qrTitle, setQrTitle] = useState("");

  if (!isVisible || !slotDetails) return null;

  const showQrCode = (value: string, title: string) => {
    setQrValue(value);
    setQrTitle(title);
    setQrDialogOpen(true);
  };

  const hasStation = slotDetails.tags?.includes("station");
  const hasTray = slotDetails.tray_id !== null && slotDetails.tray_id !== "";

  const formattedDate = slotDetails.updated_at 
    ? format(new Date(slotDetails.updated_at), "PPp")
    : "N/A";

  return (
    <>
      <div 
        className="animate-slide-in-right"
        style={{ 
          width: '320px',
          marginLeft: '30px'
        }}
      >
        <div className="space-y-4">
          {/* Slot ID Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Slot ID</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-lg font-semibold" style={{ color: '#351c75' }}>
                {slotDetails.slot_id}
              </span>
              <button
                onClick={() => showQrCode(slotDetails.slot_id, "Slot ID")}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                aria-label="Show QR Code"
              >
                <QrCode className="h-5 w-5" style={{ color: '#351c75' }} />
              </button>
            </CardContent>
          </Card>

          {/* Station Section */}
          {hasStation && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Station</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-lg font-semibold" style={{ color: '#351c75' }}>
                  {slotDetails.slot_name}
                </span>
                <button
                  onClick={() => showQrCode(slotDetails.slot_name, "Station")}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                  aria-label="Show QR Code"
                >
                  <QrCode className="h-5 w-5" style={{ color: '#351c75' }} />
                </button>
              </CardContent>
            </Card>
          )}

          {/* Tray ID Section */}
          {hasTray && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tray ID</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-lg font-semibold" style={{ color: '#351c75' }}>
                  {slotDetails.tray_id}
                </span>
                <button
                  onClick={() => showQrCode(slotDetails.tray_id!, "Tray ID")}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                  aria-label="Show QR Code"
                >
                  <QrCode className="h-5 w-5" style={{ color: '#351c75' }} />
                </button>
              </CardContent>
            </Card>
          )}

          {/* Additional Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium capitalize">{slotDetails.slot_status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Slot Height</span>
                <span className="text-sm font-medium">{slotDetails.slot_height}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm font-medium capitalize">
                  {slotDetails.tags?.[0] || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Updated At</span>
                <span className="text-sm font-medium">{formattedDate}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{qrTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-6">
            <QRCodeSVG value={qrValue} size={256} level="H" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SlotDetailsPanel;
