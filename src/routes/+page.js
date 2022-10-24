import {redirect} from '@sveltejs/kit';

import {articleURL} from '$lib/config';
import {isDev} from '$lib/env';

export function load () {
	throw redirect(301, isDev ? '/test' : articleURL);
}
