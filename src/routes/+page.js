import {redirect} from '@sveltejs/kit';

import {articleURL} from '$lib/config';
import {isDev} from '$lib/env';

export function load () {
	if (!isDev) {
		throw redirect(301, articleURL);
	}
	return {};
}
