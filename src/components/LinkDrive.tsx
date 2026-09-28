import { ExternalLink } from "lucide-react";

interface LinkDriveProps {
  status: string;
  driveUrl: string | null | undefined;
}

// O link é gravado pelo n8n alguns segundos depois da aprovação
export const LinkDrive = ({ status, driveUrl }: LinkDriveProps) => {
  if (status !== "aprovada" && !driveUrl) return null;

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">Arquivo no Drive</p>
      {driveUrl ? (
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir no Google Drive
        </a>
      ) : (
        <p className="text-sm text-muted-foreground italic">Link ainda não disponível</p>
      )}
    </div>
  );
};
