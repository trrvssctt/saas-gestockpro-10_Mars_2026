import React, { useEffect, useState } from 'react';
import {
  Package, Refrigerator, WashingMachine, AirVent, Fan, Laptop, Printer,
  Smartphone, Armchair, Briefcase, Wrench, Zap, Truck, ShieldCheck, Monitor
} from 'lucide-react';
import { categoryIconKey } from '../utils/displayHelpers.js';

const ICONS: Record<string, any> = {
  fridge: Refrigerator, washer: WashingMachine, cooking: Package, aircon: AirVent, fan: Fan,
  computer: Laptop, printer: Printer, energy: Zap, phone: Smartphone, office: Monitor,
  chair: Armchair, install: Wrench, delivery: Truck, warranty: ShieldCheck, service: Briefcase,
  product: Package
};

/** Icône représentative d'une catégorie / sous-catégorie / nom d'article. */
export const CategoryIcon: React.FC<{ hint?: string; size?: number; fallback?: any }> = ({ hint, size = 24, fallback = Package }) => {
  const key = categoryIconKey(hint || '');
  const Icon = (key && ICONS[key]) || fallback;
  return <Icon size={size} />;
};

/**
 * <img> qui bascule sur un visuel de remplacement si l'URL est vide ou ne charge pas
 * (évite l'affichage du texte alternatif d'une image cassée).
 */
const SafeImage: React.FC<{ src?: string | null; alt?: string; className?: string; fallback: React.ReactNode }> = ({ src, alt = '', className, fallback }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) return <>{fallback}</>;
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
};

export default SafeImage;
