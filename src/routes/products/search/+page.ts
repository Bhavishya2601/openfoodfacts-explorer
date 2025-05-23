import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Product } from '$lib/api';
import { API_HOST } from '$lib/const';

function isValidEAN13(code: string): boolean {
	if (!/^\d{13}$/.test(code)) {
		return false;
	}

	const digits = code.split('').map(Number);
	const checksum =
		digits.slice(0, 12).reduce((sum, digit, index) => {
			return sum + digit * (index % 2 === 0 ? 1 : 3);
		}, 0) % 10;

	const checkDigit = (10 - checksum) % 10;
	return checkDigit === digits[12];
}

export const load: PageLoad = async ({ fetch, url }) => {
	const query = url.searchParams.get('q');

	if (query == null || query.length === 0) {
		error(400, 'Missing query parameter');
	}

	// If the code is an EAN13 code, we can directly fetch the product
	if (isValidEAN13(query)) {
		redirect(308, `/products/${query}`);
	}

	const page = url.searchParams.get('page') || '1';

	const urlSearch = new URLSearchParams({
		search_terms: query,
		search_simple: '1',
		json: '1',
		page: page
	});

	const result = fetch(`${API_HOST}/cgi/search.pl?` + urlSearch.toString())
		.then((res) => {
			if (!res.ok) {
				error(400, 'Failed to fetch data');
			}
			return res;
		})
		.then(
			(res) =>
				res.json() as Promise<{
					count: number;
					page: number;
					page_size: number;
					page_count: number;
					products: Product[];
				}>
		)
		.then((data) => {
			return {
				...data,
				total_pages: Math.ceil(data.count / data.page_size)
			};
		});

	return {
		result: result
	};
};
