import type { TopResponse, SearchResponse, PersonDetailResponse } from './types';

const API_URL = typeof window !== 'undefined'
  ? process.env.NEXT_PUBLIC_API_URL || ''
  : process.env.NEXT_PUBLIC_API_URL || '';

export async function getTop(n = 20): Promise<TopResponse> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/api/top?n=${n}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }
  const res = await fetch('/mocks/top.json');
  return res.json();
}

export async function search(q: string): Promise<SearchResponse> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }
  // Mock: filter top.json by name
  const top = await getTop();
  const lower = q.toLowerCase();
  return {
    query: q,
    results: top.results
      .filter((p) => p.name.toLowerCase().includes(lower))
      .slice(0, 20),
  };
}

export async function getPerson(id: string): Promise<PersonDetailResponse> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/api/person/${id}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }
  const res = await fetch(`/mocks/person/${id}.json`);
  if (!res.ok) throw new Error(`No mock data for person ${id}`);
  return res.json();
}
