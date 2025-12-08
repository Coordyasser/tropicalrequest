import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock } from "lucide-react";

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function PinDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "Autenticação Necessária",
  description = "Digite o PIN de 4 dígitos para continuar",
}: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleValidate = async () => {
    if (pin.length !== 4) {
      setError("Digite os 4 dígitos do PIN");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "validate-pin",
        {
          body: { pin },
        }
      );

      if (fnError) throw fnError;

      if (data?.valid) {
        setPin("");
        onOpenChange(false);
        onSuccess();
      } else {
        setError("PIN incorreto");
        setPin("");
      }
    } catch (err: any) {
      console.error("Erro ao validar PIN:", err);
      setError("Erro ao validar PIN");
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    setPin(value);
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <InputOTP
            maxLength={4}
            value={pin}
            onChange={handlePinChange}
            disabled={loading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <Button
            onClick={handleValidate}
            disabled={loading || pin.length !== 4}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
