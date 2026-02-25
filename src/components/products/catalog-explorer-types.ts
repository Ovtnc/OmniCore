export type StoreItem = { id: string; name: string; slug: string; productCount: number };
export type CategoryItem = { id: string; name: string; slug: string; productCount: number };
export type ProductItem = {
  id: string;
  sku: string;
  name: string;
  salePrice: number;
  listPrice: number;
  stockQuantity: number;
  isActive: boolean;
  brand: string | null;
  imageUrl: string | null;
  platforms: string[];
};

export type ExplorerData =
  | { view: 'stores'; stores: StoreItem[] }
  | {
      view: 'categories';
      store: { id: string; name: string; slug: string };
      storeProductCount: number;
      categories: CategoryItem[];
    }
  | {
      view: 'products';
      store: { id: string; name: string; slug: string };
      category: { id: string; name: string; slug: string };
      products: ProductItem[];
    };

export type UploadDialogPayload = {
  storeId: string;
  categoryId: string;
  categoryName: string;
};
