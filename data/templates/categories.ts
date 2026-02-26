export type TemplateCategory = 
  | 'all' 
  | 'favorites'
  | 'my_workflows'
  | 'featured' 
  | 'ads' 
  | 'ecommerce' 
  | 'film' 
  | 'life' 
  | 'tools' 
  | 'fun' 
  | 'acg';

export interface CategoryDef {
  id: TemplateCategory;
  icon?: string; // Icon name from Lucide
}

export const TEMPLATE_CATEGORIES: CategoryDef[] = [
  { id: 'all', icon: 'LayoutGrid' },
  { id: 'favorites', icon: 'Star' },
  { id: 'my_workflows', icon: 'FolderHeart' },
  { id: 'featured', icon: 'Sparkles' },
  { id: 'ads', icon: 'Megaphone' },
  { id: 'ecommerce', icon: 'ShoppingBag' },
  { id: 'film', icon: 'Clapperboard' },
  { id: 'life', icon: 'Coffee' },
  { id: 'tools', icon: 'Wrench' },
  { id: 'fun', icon: 'Gamepad2' },
  { id: 'acg', icon: 'Ghost' },
];
