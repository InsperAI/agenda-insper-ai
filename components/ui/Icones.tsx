import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CalendarSync,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Link2,
  MapPin,
  Pencil,
  Plus,
  Repeat2,
  Search,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

/**
 * Ícones do lucide-react com o traço e o tamanho da casa (16 px, traço 1.75).
 * Os nomes `Ico*` ficam estáveis para não espalhar o nome da biblioteca pelo app.
 * Sempre decorativos (aria-hidden); quem precisa de rótulo põe no botão.
 */
function ico(Icone: LucideIcon) {
  const Ico = (p: P) => <Icone size={16} strokeWidth={1.75} aria-hidden {...p} />;
  Ico.displayName = `Ico(${Icone.displayName ?? "lucide"})`;
  return Ico;
}

export const IcoEsquerda = ico(ChevronLeft);
export const IcoDireita = ico(ChevronRight);
export const IcoMais = ico(Plus);
export const IcoFechar = ico(X);
export const IcoLupa = ico(Search);
export const IcoLocal = ico(MapPin);
export const IcoLink = ico(Link2);
export const IcoRepetir = ico(Repeat2);
export const IcoBaixar = ico(Download);
export const IcoLixeira = ico(Trash2);
export const IcoLapis = ico(Pencil);
export const IcoRelogio = ico(Clock);
export const IcoCalendario = ico(CalendarDays);
export const IcoCopiar = ico(Copy);
export const IcoChecar = ico(Check);
export const IcoPessoa = ico(Users);
export const IcoExterno = ico(ArrowUpRight);
export const IcoDisponibilidade = ico(CalendarClock);
export const IcoConectar = ico(CalendarSync);

/** Logo do Google, colorido, para o botão de entrar (marca: fica fora do lucide). */
export const IcoGoogle = (p: P) => (
  <svg width={18} height={18} viewBox="0 0 48 48" aria-hidden="true" {...p}>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 019.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 000 24c0 3.9.9 7.5 2.6 10.7l7.8-6z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z" />
  </svg>
);
