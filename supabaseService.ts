import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppSettings, TowarItem } from './types';
import { MOCK_TOWARY } from './mockData';

let clientInstance: { client: SupabaseClient; url: string; key: string } | null = null;

export function getSupabaseClient(settings: AppSettings): SupabaseClient | null {
  const url = (settings.supabaseUrl || '').trim();
  const key = (settings.supabaseAnonKey || '').trim();

  if (!url || !key) {
    return null;
  }

  if (clientInstance && clientInstance.url === url && clientInstance.key === key) {
    return clientInstance.client;
  }

  try {
    const client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    clientInstance = { client, url, key };
    return client;
  } catch (err) {
    console.error('Failed to create Supabase client', err);
    return null;
  }
}

// Clean alphanumeric string for fuzzy matching (removes hyphens, spaces, slashes)
export function normalizeCode(val: string | null | undefined): string {
  if (!val) return '';
  return String(val).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export interface SearchResultResponse {
  items: TowarItem[];
  isDemo: boolean;
  totalCount: number;
  error?: string;
  searchedFields: string[];
}

export async function searchTowar(
  query: string,
  settings: AppSettings,
  searchType: 'all' | 'catalog' | 'code' | 'name' | 'opis' = 'all'
): Promise<SearchResultResponse> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { items: [], isDemo: false, totalCount: 0, searchedFields: [] };
  }

  const supabase = getSupabaseClient(settings);

  // If Supabase is not configured or in Demo Mode, search local mock data
  if (!supabase || settings.demoMode) {
    const normalizedQ = normalizeCode(trimmedQuery);
    const lowerQ = trimmedQuery.toLowerCase();

    const filtered = MOCK_TOWARY.filter(item => {
      const nrKat = String(item['Nr katalogowy'] || item.nr_katalogowy || '');
      const kod = String(item.Kod || item.kod || item['kod'] || '');
      const nazwa = String(item.Nazwa || item.nazwa || '');
      const opis = String(item.Opis || item.opis || '');

      const matchNrKat = nrKat.toLowerCase().includes(lowerQ) || (normalizedQ.length >= 3 && normalizeCode(nrKat).includes(normalizedQ));
      const matchKod = kod.toLowerCase().includes(lowerQ) || (normalizedQ.length >= 3 && normalizeCode(kod).includes(normalizedQ));
      const matchNazwa = nazwa.toLowerCase().includes(lowerQ);
      const matchOpis = opis.toLowerCase().includes(lowerQ) || (normalizedQ.length >= 3 && normalizeCode(opis).includes(normalizedQ));

      if (searchType === 'catalog') return matchNrKat;
      if (searchType === 'code') return matchKod;
      if (searchType === 'name') return matchNazwa;
      if (searchType === 'opis') return matchOpis;
      return matchNrKat || matchKod || matchNazwa || matchOpis;
    });

    return {
      items: filtered,
      isDemo: true,
      totalCount: filtered.length,
      searchedFields: ['Nr katalogowy', 'Kod', 'Nazwa', 'Opis'],
    };
  }

  const tableName = settings.tableName || 'towar';
  const catCol = settings.catalogNumberColumn || 'Nr katalogowy';
  const codeCol = settings.codeColumn || 'Kod';
  const nameCol = settings.nameColumn || 'Nazwa';
  const opisCol = settings.descriptionColumn || 'Opis';

  const searchedFields = [catCol, codeCol, nameCol, opisCol];

  try {
    const wildCard = settings.searchMode === 'exact' ? trimmedQuery : `%${trimmedQuery}%`;

    let items: TowarItem[] = [];
    let lastError: string | null = null;

    if (searchType === 'all') {
      // Search all configured columns in parallel (avoids PostgREST .or() syntax & comma parsing failures)
      const targetColumns = Array.from(new Set([
        opisCol,
        catCol,
        codeCol,
        nameCol,
        // Also include common lowercase variations in case database uses lowercase columns
        'Opis', 'opis',
        'Nr katalogowy', 'nr_katalogowy', 'nrKatalogowy',
        'Kod', 'kod', 'code',
        'Nazwa', 'nazwa'
      ])).filter(Boolean);

      const queryPromises = targetColumns.map(col => {
        if (settings.searchMode === 'exact') {
          return supabase.from(tableName).select('*').eq(col, trimmedQuery).limit(50);
        } else {
          return supabase.from(tableName).select('*').ilike(col, wildCard).limit(50);
        }
      });

      const responses = await Promise.allSettled(queryPromises);

      const seenKeys = new Set<string>();
      let anySuccessfulQuery = false;

      for (const res of responses) {
        if (res.status === 'fulfilled') {
          if (!res.value.error && res.value.data) {
            anySuccessfulQuery = true;
            for (const item of res.value.data as TowarItem[]) {
              const uniqueKey = item.id !== undefined && item.id !== null
                ? `id_${item.id}`
                : `${getFieldVal(item, ['Nr katalogowy', 'nr_katalogowy'])}|${getFieldVal(item, ['Kod', 'kod'])}|${getFieldVal(item, ['Nazwa', 'nazwa'])}|${getFieldVal(item, ['Opis', 'opis'])}`;
              
              if (!seenKeys.has(uniqueKey)) {
                seenKeys.add(uniqueKey);
                items.push(item);
              }
            }
          } else if (res.value.error) {
            // Store error in case all queries fail
            lastError = res.value.error.message;
          }
        }
      }

      if (!anySuccessfulQuery && lastError && items.length === 0) {
        return {
          items: [],
          isDemo: false,
          totalCount: 0,
          error: `Błąd zapytania Supabase: ${lastError}. Sprawdź konfigurację tabeli i kolumn w Ustawieniach.`,
          searchedFields,
        };
      }
    } else {
      // Single specific field search
      let colToQuery = catCol;
      if (searchType === 'code') colToQuery = codeCol;
      else if (searchType === 'name') colToQuery = nameCol;
      else if (searchType === 'opis') colToQuery = opisCol;

      let queryBuilder = supabase.from(tableName).select('*');
      if (settings.searchMode === 'exact') {
        queryBuilder = queryBuilder.eq(colToQuery, trimmedQuery);
      } else {
        queryBuilder = queryBuilder.ilike(colToQuery, wildCard);
      }

      const { data, error } = await queryBuilder.limit(50);

      if (error) {
        // Try fallback with lowercase version if column wasn't found
        const altCol = colToQuery.toLowerCase();
        if (altCol !== colToQuery) {
          const fallbackQuery = settings.searchMode === 'exact'
            ? supabase.from(tableName).select('*').eq(altCol, trimmedQuery)
            : supabase.from(tableName).select('*').ilike(altCol, wildCard);
          
          const fallbackRes = await fallbackQuery.limit(50);
          if (!fallbackRes.error && fallbackRes.data) {
            items = fallbackRes.data as TowarItem[];
          } else {
            return {
              items: [],
              isDemo: false,
              totalCount: 0,
              error: `Błąd kolumny "${colToQuery}": ${error.message}`,
              searchedFields: [colToQuery],
            };
          }
        } else {
          return {
            items: [],
            isDemo: false,
            totalCount: 0,
            error: `Błąd kolumny "${colToQuery}": ${error.message}`,
            searchedFields: [colToQuery],
          };
        }
      } else if (data) {
        items = data as TowarItem[];
      }
    }
    if (items.length === 0 && trimmedQuery.replace(/[^A-Z0-9]/gi, '').length >= 3) {
      // Secondary pass for numbers with formatting differences (e.g. "0445110239" vs "0 445 110 239")
      const broaderResult = await supabase.from(tableName).select('*').limit(150);
      if (broaderResult.data) {
        const normQ = normalizeCode(trimmedQuery);
        const secondary = (broaderResult.data as TowarItem[]).filter(row => {
          const rCat = getFieldVal(row, ['Nr katalogowy', 'nr_katalogowy', 'nrKatalogowy', 'catalog_number']);
          const rKod = getFieldVal(row, ['Kod', 'kod', 'kod_towaru', 'code', 'ean']);
          const rNazwa = getFieldVal(row, ['Nazwa', 'nazwa', 'name', 'nazwa_towaru']);
          const rOpis = getFieldVal(row, ['Opis', 'opis', 'description']);
          return (
            normalizeCode(rCat).includes(normQ) ||
            normalizeCode(rKod).includes(normQ) ||
            normalizeCode(rNazwa).includes(normQ) ||
            normalizeCode(rOpis).includes(normQ)
          );
        });
        if (secondary.length > 0) {
          items = secondary;
        }
      }
    }

    return {
      items,
      isDemo: false,
      totalCount: items.length,
      searchedFields,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nieznany błąd połączenia z Supabase';
    console.error('Supabase search exception:', err);
    return {
      items: [],
      isDemo: false,
      totalCount: 0,
      error: `Błąd sieci / Supabase: ${msg}`,
      searchedFields,
    };
  }
}

async function attemptFlexibleFallback(supabase: SupabaseClient, tableName: string, query: string): Promise<{ success: boolean; data: TowarItem[] }> {
  try {
    const wild = `%${query}%`;
    // Try lower-case and standard column names
    const res = await supabase.from(tableName).select('*')
      .or(`opis.ilike.${wild},nr_katalogowy.ilike.${wild},kod.ilike.${wild},nazwa.ilike.${wild},"Opis".ilike.${wild}`)
      .limit(50);
    
    if (!res.error && res.data) {
      return { success: true, data: res.data as TowarItem[] };
    }
  } catch {
    // ignore
  }
  return { success: false, data: [] };
}

export async function testSupabaseConnection(settings: AppSettings): Promise<{ ok: boolean; message: string; rowCount?: number; columns?: string[] }> {
  const supabase = getSupabaseClient(settings);
  if (!supabase) {
    return { ok: false, message: 'Podaj Supabase Project URL oraz Anon API Key' };
  }

  const tableName = settings.tableName || 'towar';

  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(3);
    if (error) {
      return { ok: false, message: `Błąd bazy danych: ${error.message} (kod: ${error.code})` };
    }

    const cols = data && data.length > 0 ? Object.keys(data[0]) : [];
    return {
      ok: true,
      message: `Połączono pomyślnie z tabelą "${tableName}"! Znaleziono ${data?.length || 0} przykładowych wierszy.`,
      rowCount: data?.length || 0,
      columns: cols,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Błąd połączenia';
    return { ok: false, message: `Błąd połączenia: ${msg}` };
  }
}

// Utility to read field with multiple aliases
export function getFieldVal(item: TowarItem, aliases: string[]): string {
  for (const alias of aliases) {
    if (item[alias] !== undefined && item[alias] !== null && String(item[alias]).trim() !== '') {
      return String(item[alias]);
    }
  }
  // Try case-insensitive lookup
  for (const key of Object.keys(item)) {
    const lowerKey = key.toLowerCase();
    for (const alias of aliases) {
      if (lowerKey === alias.toLowerCase() && item[key] !== undefined && item[key] !== null) {
        return String(item[key]);
      }
    }
  }
  return '';
}
