import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MapPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex aspect-video w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50',
        className
      )}
    >
      <MapPin className="mb-2 h-10 w-10 text-muted-foreground" />
      <p className="text-center text-muted-foreground">
        Integração com Mapa
        <br />
        <span className="text-xs">Busca e seleção de endereço aqui.</span>
      </p>
    </div>
  );
}
