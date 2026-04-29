import type { TopResponse, SearchResponse, PersonDetailResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchApi<T>(path: string): Promise<T> {
  if (!API_URL) {
    // Fall back to local mocks
    const mockPath = `/mocks${path.replace('/api', '')}.json`;
    const res = await fetch(mockPath);
    if (!res.ok) throw new Error(`Mock not found: ${mockPath}`);
    return res.json();
  }
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getTop(n = 20): Promise<TopResponse> {
  return fetchApi<TopResponse>(`/api/top?n=${n}`);
}

export async function search(q: string): Promise<SearchResponse> {
  return fetchApi<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`);
}

export async function getPerson(id: string): Promise<PersonDetailResponse> {
  return fetchApi<PersonDetailResponse>(`/api/person/${id}`);
}
