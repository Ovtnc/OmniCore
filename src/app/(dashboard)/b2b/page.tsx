'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  ListOrdered,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StoreOption = { id: string; name: string };
type B2BCustomer = {
  id: string;
  code: string;
  name: string;
  taxNumber: string | null;
  email: string | null;
  isActive: boolean;
  priceList?: { id: string; name: string } | null;
};
type B2BPriceList = {
  id: string;
  name: string;
  currency: string;
  customer: { id: string; code: string; name: string };
  _count: { products: number };
};

export default function B2BPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState('');
  const [customers, setCustomers] = useState<B2BCustomer[]>([]);
  const [priceLists, setPriceLists] = useState<B2BPriceList[]>([]);
  const [products, setProducts] = useState<{ id: string; sku: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showPriceListForm, setShowPriceListForm] = useState(false);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [listProducts, setListProducts] = useState<
    { productId: string; product: { sku: string; name: string }; price: number; minQuantity: number }[]
  >([]);
  const [customerForm, setCustomerForm] = useState({
    code: '',
    name: '',
    taxNumber: '',
    email: '',
  });
  const [priceListForm, setPriceListForm] = useState({ b2bCustomerId: '', name: '' });
  const [addProductForm, setAddProductForm] = useState<{ listId: string; productId: string; price: string }>({
    listId: '',
    productId: '',
    price: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
          setStoreId(data[0].id);
        }
      })
      .catch(() => setStores([]));
  }, []);

  useEffect(() => {
    if (!storeId) {
      setCustomers([]);
      setPriceLists([]);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/stores/${storeId}/b2b-customers`).then((r) => r.json()),
      fetch(`/api/stores/${storeId}/b2b-price-lists`).then((r) => r.json()),
      fetch(`/api/products?storeId=${storeId}&limit=500`).then((r) => r.json()),
    ])
      .then(([cust, lists, prod]) => {
        setCustomers(Array.isArray(cust) ? cust : []);
        setPriceLists(Array.isArray(lists) ? lists : []);
        setProducts(Array.isArray(prod?.products) ? prod.products.map((p: { id: string; sku: string; name: string }) => ({ id: p.id, sku: p.sku, name: p.name })) : []);
      })
      .catch(() => {
        setCustomers([]);
        setPriceLists([]);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  const loadListProducts = (listId: string) => {
    fetch(`/api/stores/${storeId}/b2b-price-lists/${listId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.products) setListProducts(data.products.map((p: { productId: string; product: { sku: string; name: string }; price: number | string; minQuantity: number }) => ({ ...p, price: Number(p.price), minQuantity: p.minQuantity ?? 1 })));
      })
      .catch(() => setListProducts([]));
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !customerForm.code.trim() || !customerForm.name.trim()) return;
    setError('');
    setSaving(true);
    fetch(`/api/stores/${storeId}/b2b-customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: customerForm.code.trim(),
        name: customerForm.name.trim(),
        taxNumber: customerForm.taxNumber.trim() || undefined,
        email: customerForm.email.trim() || undefined,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCustomers((prev) => [...prev, data]);
        setCustomerForm({ code: '', name: '', taxNumber: '', email: '' });
        setShowCustomerForm(false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Eklenemedi'))
      .finally(() => setSaving(false));
  };

  const handleDeleteCustomer = (id: string) => {
    if (!confirm('Bu B2B müşterisini silmek istediğinize emin misiniz?')) return;
    fetch(`/api/stores/${storeId}/b2b-customers/${id}`, { method: 'DELETE' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setCustomers((prev) => prev.filter((c) => c.id !== id));
          setPriceLists((prev) => prev.filter((l) => l.customer.id !== id));
        }
      })
      .catch(() => {});
  };

  const handleAddPriceList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !priceListForm.b2bCustomerId) return;
    setError('');
    setSaving(true);
    fetch(`/api/stores/${storeId}/b2b-price-lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        b2bCustomerId: priceListForm.b2bCustomerId,
        name: priceListForm.name.trim() || undefined,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPriceLists((prev) => [{ ...data, _count: { products: 0 } }, ...prev]);
        setPriceListForm({ b2bCustomerId: '', name: '' });
        setShowPriceListForm(false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Eklenemedi'))
      .finally(() => setSaving(false));
  };

  const handleDeletePriceList = (id: string) => {
    if (!confirm('Bu fiyat listesini silmek istediğinize emin misiniz?')) return;
    fetch(`/api/stores/${storeId}/b2b-price-lists/${id}`, { method: 'DELETE' })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setPriceLists((prev) => prev.filter((l) => l.id !== id));
      })
      .catch(() => {});
  };

  const handleAddProductToList = (e: React.FormEvent) => {
    e.preventDefault();
    const { listId, productId, price } = addProductForm;
    if (!storeId || !listId || !productId) return;
    setSaving(true);
    fetch(`/api/stores/${storeId}/b2b-price-lists/${listId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, price: parseFloat(price) || 0 }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        loadListProducts(listId);
        setAddProductForm((f) => (f.listId === listId ? { listId: '', productId: '', price: '' } : f));
      })
      .finally(() => setSaving(false));
  };

  const handleRemoveProductFromList = (listId: string, productId: string) => {
    fetch(
      `/api/stores/${storeId}/b2b-price-lists/${listId}/products?productId=${encodeURIComponent(productId)}`,
      { method: 'DELETE' }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) loadListProducts(listId);
      })
      .catch(() => {});
  };

  const toggleExpand = (listId: string) => {
    if (expandedListId === listId) {
      setExpandedListId(null);
      setListProducts([]);
    } else {
      setExpandedListId(listId);
      loadListProducts(listId);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">B2B</h1>
        <p className="text-muted-foreground">
          Bayi müşterileri ve fiyat listeleri. Müşteri ekleyin, fiyat listesi oluşturup ürün atayın.
        </p>
      </div>

      {stores.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Önce bir mağaza oluşturun. <Link href="/stores" className="text-primary underline">Mağazalar</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mağaza</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Mağaza seçin" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                B2B Müşteriler
              </CardTitle>
              <CardDescription>Cari kod, unvan ve iletişim bilgileri</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-4 text-muted-foreground">Yükleniyor...</p>
              ) : (
                <>
                  <div className="mb-4 flex justify-end">
                    <Button onClick={() => setShowCustomerForm(!showCustomerForm)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Müşteri Ekle
                    </Button>
                  </div>
                  {showCustomerForm && (
                    <form onSubmit={handleAddCustomer} className="mb-6 space-y-4 rounded-lg border p-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <Label>Cari kod *</Label>
                          <Input
                            value={customerForm.code}
                            onChange={(e) => setCustomerForm((f) => ({ ...f, code: e.target.value }))}
                            placeholder="CAR-001"
                            required
                          />
                        </div>
                        <div>
                          <Label>Unvan / Ad *</Label>
                          <Input
                            value={customerForm.name}
                            onChange={(e) => setCustomerForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Şirket Adı"
                            required
                          />
                        </div>
                        <div>
                          <Label>Vergi no</Label>
                          <Input
                            value={customerForm.taxNumber}
                            onChange={(e) => setCustomerForm((f) => ({ ...f, taxNumber: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>E-posta</Label>
                          <Input
                            type="email"
                            value={customerForm.email}
                            onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))}
                          />
                        </div>
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" disabled={saving}>
                          {saving ? 'Ekleniyor...' : 'Ekle'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowCustomerForm(false)}>
                          İptal
                        </Button>
                      </div>
                    </form>
                  )}
                  {customers.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground">
                      Henüz B2B müşteri yok. Müşteri ekleyin.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {customers.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between rounded-lg border px-4 py-3"
                        >
                          <div>
                            <span className="font-medium">{c.name}</span>
                            <span className="ml-2 font-mono text-sm text-muted-foreground">
                              {c.code}
                            </span>
                            {c.taxNumber && (
                              <span className="ml-2 text-xs text-muted-foreground">VKN: {c.taxNumber}</span>
                            )}
                            {c.priceList && (
                              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                                Fiyat listesi: {c.priceList.name}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCustomer(c.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5" />
                Fiyat Listeleri
              </CardTitle>
              <CardDescription>Müşteriye özel fiyat listesi ve ürün ataması</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-end">
                <Button onClick={() => setShowPriceListForm(!showPriceListForm)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Fiyat Listesi Ekle
                </Button>
              </div>
              {showPriceListForm && (
                <form onSubmit={handleAddPriceList} className="mb-6 space-y-4 rounded-lg border p-4">
                  <div className="grid gap-2">
                    <Label>Müşteri (fiyat listesi olmayan)</Label>
                    <Select
                      value={priceListForm.b2bCustomerId}
                      onValueChange={(v) => setPriceListForm((f) => ({ ...f, b2bCustomerId: v }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers
                          .filter((c) => !priceLists.some((l) => l.customer.id === c.id))
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c.code})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Liste adı (isteğe bağlı)</Label>
                    <Input
                      value={priceListForm.name}
                      onChange={(e) => setPriceListForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Örn: Bayi 2025"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Ekleniyor...' : 'Ekle'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowPriceListForm(false)}>
                      İptal
                    </Button>
                  </div>
                </form>
              )}
              {priceLists.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">
                  Henüz fiyat listesi yok. Müşteri seçip liste oluşturun.
                </p>
              ) : (
                <ul className="space-y-2">
                  {priceLists.map((list) => (
                    <li key={list.id} className="rounded-lg border">
                      <div
                        className="flex cursor-pointer items-center justify-between px-4 py-3"
                        onClick={() => toggleExpand(list.id)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedListId === list.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{list.name}</span>
                          <span className="text-muted-foreground">
                            — {list.customer.name} · {list._count.products} ürün
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePriceList(list.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {expandedListId === list.id && (
                        <div className="border-t bg-muted/20 px-4 py-3">
                          {listProducts.length === 0 && !saving ? (
                            <p className="text-sm text-muted-foreground">Ürün yok</p>
                          ) : (
                            <ul className="mb-3 space-y-1 text-sm">
                              {listProducts.map((p) => (
                                <li
                                  key={p.productId}
                                  className="flex items-center justify-between rounded py-1"
                                >
                                  <span>
                                    {p.product?.name ?? p.productId} ({p.product?.sku})
                                  </span>
                                  <span className="tabular-nums">
                                    {Number(p.price).toLocaleString('tr-TR')} {list.currency} · min: {p.minQuantity}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveProductFromList(list.id, p.productId)}
                                  >
                                    Kaldır
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (addProductForm.listId !== list.id || !addProductForm.productId) return;
                              handleAddProductToList(e);
                            }}
                            className="flex flex-wrap items-end gap-2"
                          >
                            <div className="min-w-[200px]">
                              <Label className="text-xs">Ürün</Label>
                              <Select
                                value={addProductForm.listId === list.id ? addProductForm.productId : ''}
                                onValueChange={(v) =>
                                  setAddProductForm((f) => ({ ...f, listId: list.id, productId: v }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Ürün seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products
                                    .filter(
                                      (p) =>
                                        !listProducts.some((lp) => lp.productId === p.id)
                                    )
                                    .map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.name} ({p.sku})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-24">
                              <Label className="text-xs">Fiyat</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={addProductForm.listId === list.id ? addProductForm.price : ''}
                                onChange={(e) =>
                                  setAddProductForm((f) => ({ ...f, listId: list.id, price: e.target.value }))
                                }
                                placeholder="0"
                              />
                            </div>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={
                                saving ||
                                !(addProductForm.listId === list.id && addProductForm.productId)
                              }
                            >
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                              Ekle
                            </Button>
                          </form>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
