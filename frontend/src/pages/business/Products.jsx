import { useEffect, useState } from 'react';
import FormField from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import {
  archiveProductRequest,
  createProductRequest,
  getOwnedProductsRequest,
  updateProductRequest,
} from '../../lib/api';

const EMPTY_FORM = { name: '', description: '', priceSats: '' };

const mxnPrice = (priceMxnCents) =>
  new Intl.NumberFormat('en-MX', { style: 'currency', currency: 'MXN' })
    .format(priceMxnCents / 100);

function ProductForm({ initialValue = EMPTY_FORM, isSaving, onCancel, onSubmit, submitLabel }) {
  const [form, setForm] = useState(() => ({
    name: initialValue.name ?? '',
    description: initialValue.description ?? '',
    priceCurrency: initialValue.priceCurrency ?? 'SATS',
    priceSats: String(initialValue.priceSats ?? ''),
    priceMxn: initialValue.priceMxnCents == null
      ? ''
      : String(initialValue.priceMxnCents / 100),
  }));

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      name: form.name,
      description: form.description,
      priceCurrency: form.priceCurrency,
      ...(form.priceCurrency === 'SATS'
        ? { priceSats: Number(form.priceSats) }
        : { priceMxn: Number(form.priceMxn) }),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField
        id={`product-name-${initialValue.id ?? 'new'}`}
        label="Product name"
        maxLength="100"
        required
        value={form.name}
        onChange={setField('name')}
      />
      <div>
        <label htmlFor={`product-description-${initialValue.id ?? 'new'}`} className="mb-1 block text-sm font-medium text-neutral-300">
          Description <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <textarea
          id={`product-description-${initialValue.id ?? 'new'}`}
          rows="3"
          maxLength="500"
          value={form.description}
          onChange={setField('description')}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none transition-colors focus:border-amber-500"
        />
      </div>
      <div>
        <label htmlFor={`product-currency-${initialValue.id ?? 'new'}`} className="mb-1 block text-sm font-medium text-neutral-300">Price currency</label>
        <select
          id={`product-currency-${initialValue.id ?? 'new'}`}
          value={form.priceCurrency}
          onChange={setField('priceCurrency')}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none transition-colors focus:border-amber-500"
        >
          <option value="SATS">Sats</option>
          <option value="MXN">Mexican pesos (MXN)</option>
        </select>
      </div>
      {form.priceCurrency === 'SATS' ? (
        <FormField
          id={`product-price-${initialValue.id ?? 'new'}`}
          label="Price (sats)"
          type="number"
          min="1"
          max="2147483647"
          step="1"
          required
          value={form.priceSats}
          onChange={setField('priceSats')}
        />
      ) : (
        <>
          <FormField
            id={`product-price-mxn-${initialValue.id ?? 'new'}`}
            label="Price (MXN)"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.priceMxn}
            onChange={setField('priceMxn')}
          />
          <p className="text-xs text-neutral-500">CoinGecko converts this price to sats when you save it and refreshes it at checkout.</p>
        </>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-700 px-5 py-2.5 font-medium text-white hover:border-neutral-500">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function Products() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => {
    let active = true;
    getOwnedProductsRequest(token)
      .then(({ products: result }) => {
        if (active) setProducts(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  const replaceProduct = (product) => {
    setProducts((current) => current.map((entry) => entry.id === product.id ? product : entry));
  };

  const createProduct = async (input) => {
    setError(null);
    setIsSaving(true);
    try {
      const { product } = await createProductRequest(input, token);
      setProducts((current) => [product, ...current]);
      setFormVersion((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateProduct = async (productId, input) => {
    setError(null);
    setIsSaving(true);
    try {
      const { product } = await updateProductRequest(productId, input, token);
      replaceProduct(product);
      setEditingId(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const setProductActive = async (product, isActive) => {
    setError(null);
    try {
      const result = isActive
        ? await updateProductRequest(product.id, { isActive: true }, token)
        : await archiveProductRequest(product.id, token);
      replaceProduct(result.product);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <p className="mt-2 text-neutral-400">Create a quick checkout menu. Customers choose an item and your server supplies its trusted price.</p>
      </div>

      <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Add a product</h2>
        <div className="mt-4 max-w-xl">
          <ProductForm key={formVersion} isSaving={isSaving} onSubmit={createProduct} submitLabel="Add product" />
        </div>
      </section>

      {error && <p className="mt-5 text-red-400" role="alert">{error}</p>}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Catalog</h2>
          <span className="text-sm text-neutral-500">{products.filter((product) => product.isActive).length} active</span>
        </div>
        {isLoading ? (
          <p className="mt-5 text-neutral-500">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-neutral-700 p-8 text-center text-neutral-500">No products yet. Add your first item above.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className={`rounded-xl border p-5 ${product.isActive ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-800/60 bg-neutral-950/40 opacity-70'}`}>
                {editingId === product.id ? (
                  <ProductForm
                    initialValue={product}
                    isSaving={isSaving}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(input) => updateProduct(product.id, input)}
                    submitLabel="Save changes"
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-white">{product.name}</h3>
                        <p className="mt-1 text-sm text-neutral-400">{product.description || 'No description'}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${product.isActive ? 'bg-green-500/10 text-green-400' : 'bg-neutral-800 text-neutral-400'}`}>
                        {product.isActive ? 'Active' : 'Archived'}
                      </span>
                    </div>
                    <div className="mt-5">
                      <p className="text-xl font-bold text-amber-400">
                        {product.priceCurrency === 'MXN'
                          ? mxnPrice(product.priceMxnCents)
                          : `${product.priceSats.toLocaleString()} sats`}
                      </p>
                      {product.priceCurrency === 'MXN' && (
                        <p className="mt-1 text-xs text-neutral-500">≈ {product.priceSats.toLocaleString()} sats at the latest rate</p>
                      )}
                    </div>
                    <div className="mt-5 flex gap-3 text-sm">
                      <button type="button" onClick={() => setEditingId(product.id)} className="rounded-lg border border-neutral-700 px-4 py-2 font-medium text-white hover:border-amber-500 hover:text-amber-400">Edit</button>
                      <button type="button" onClick={() => setProductActive(product, !product.isActive)} className="rounded-lg px-4 py-2 font-medium text-neutral-400 hover:text-white">
                        {product.isActive ? 'Archive' : 'Reactivate'}
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Products;
