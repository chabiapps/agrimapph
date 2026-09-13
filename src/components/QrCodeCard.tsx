import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Props {
  url: string;
  fileName?: string;
  caption?: string;
}

const QrCodeCard = ({ url, fileName = "agrimap-profile", caption }: Props) => {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: "#14532d", light: "#ffffff" } })
      .then((d) => { if (active) setDataUrl(d); })
      .catch(() => { if (active) setDataUrl(""); });
    return () => { active = false; };
  }, [url]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${fileName}.png`;
    a.click();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center gap-3">
      {dataUrl ? (
        <img src={dataUrl} alt="QR code ng pampublikong profile" className="w-44 h-44 rounded-lg" />
      ) : (
        <div className="w-44 h-44 rounded-lg bg-muted animate-pulse" />
      )}
      <p className="text-sm text-muted-foreground text-center break-all">{caption ?? url}</p>
      <Button onClick={download} variant="outline" className="w-full min-h-[48px] text-base font-semibold">
        <Download className="h-4 w-4 mr-2" /> I-download ang QR (PNG)
      </Button>
    </div>
  );
};

export default QrCodeCard;
