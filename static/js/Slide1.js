function noop() { }
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function append(target, node) {
    target.appendChild(node);
}
function append_styles(target, style_sheet_id, styles) {
    const append_styles_to = get_root_for_style(target);
    if (!append_styles_to.getElementById(style_sheet_id)) {
        const style = element('style');
        style.id = style_sheet_id;
        style.textContent = styles;
        append_stylesheet(append_styles_to, style);
    }
}
function get_root_for_style(node) {
    if (!node)
        return document;
    const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    if (root && root.host) {
        return root;
    }
    return node.ownerDocument;
}
function append_stylesheet(node, style) {
    append(node.head || node, style);
    return style.sheet;
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data)
        text.data = data;
}
function set_style(node, key, value, important) {
    if (value === null) {
        node.style.removeProperty(key);
    }
    else {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
/**
 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
 * it can be called from an external module).
 *
 * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
 *
 * https://svelte.dev/docs#run-time-svelte-onmount
 */
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
/**
 * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
 */
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail, { cancelable = false } = {}) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail, { cancelable });
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
            return !event.defaultPrevented;
        }
        return true;
    };
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        while (flushidx < dirty_components.length) {
            const component = dirty_components[flushidx];
            flushidx++;
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
    else if (callback) {
        callback();
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
            // if the component was destroyed immediately
            // it will update the `$$.on_destroy` reference to `null`.
            // the destructured on_destroy may still reference to the old array
            if (component.$$.on_destroy) {
                component.$$.on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: [],
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        if (!is_function(callback)) {
            return noop;
        }
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

/* src/lib/components/HeatGrid.svelte generated by Svelte v3.51.0 */

function add_css$1(target) {
	append_styles(target, "svelte-tpl0qj", "table.svelte-tpl0qj{width:100%;height:100%}td.svelte-tpl0qj{text-align:center}td.svelte-tpl0qj:first-child{text-align:right}.datapoint.svelte-tpl0qj{width:16px;height:16px;margin:auto}");
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	child_ctx[8] = i;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i];
	child_ctx[14] = i;
	const constants_0 = /*data*/ child_ctx[0][/*i*/ child_ctx[8]][/*j*/ child_ctx[14]];
	child_ctx[10] = constants_0;

	const constants_1 = () => /*onPointHovered*/ child_ctx[4]({
		i: /*i*/ child_ctx[8],
		j: /*j*/ child_ctx[14],
		columnName: /*columnName*/ child_ctx[9],
		rowName: /*rowName*/ child_ctx[6],
		value: /*value*/ child_ctx[10]
	});

	child_ctx[11] = constants_1;
	const constants_2 = () => /*onPointHovered*/ child_ctx[4]();
	child_ctx[12] = constants_2;
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i];
	return child_ctx;
}

// (24:2) {#each columnHeaders as columnName}
function create_each_block_2(ctx) {
	let td;
	let t_value = /*columnName*/ ctx[9] + "";
	let t;

	return {
		c() {
			td = element("td");
			t = text(t_value);
			attr(td, "class", "svelte-tpl0qj");
		},
		m(target, anchor) {
			insert(target, td, anchor);
			append(td, t);
		},
		p(ctx, dirty) {
			if (dirty & /*columnHeaders*/ 4 && t_value !== (t_value = /*columnName*/ ctx[9] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(td);
		}
	};
}

// (31:3) {#each columnHeaders as columnName, j}
function create_each_block_1(ctx) {
	let td;
	let div;
	let mounted;
	let dispose;

	return {
		c() {
			td = element("td");
			div = element("div");
			attr(div, "class", "datapoint svelte-tpl0qj");
			set_style(div, "background", /*colorMap*/ ctx[3][/*value*/ ctx[10]]);
			attr(div, "tabindex", "0");
			attr(td, "class", "svelte-tpl0qj");
		},
		m(target, anchor) {
			insert(target, td, anchor);
			append(td, div);

			if (!mounted) {
				dispose = [
					listen(div, "blur", /*onExit*/ ctx[12]),
					listen(div, "focus", function () {
						if (is_function(/*onEnter*/ ctx[11])) /*onEnter*/ ctx[11].apply(this, arguments);
					}),
					listen(div, "mouseover", function () {
						if (is_function(/*onEnter*/ ctx[11])) /*onEnter*/ ctx[11].apply(this, arguments);
					}),
					listen(div, "mouseout", /*onExit*/ ctx[12])
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty & /*colorMap, data*/ 9) {
				set_style(div, "background", /*colorMap*/ ctx[3][/*value*/ ctx[10]]);
			}
		},
		d(detaching) {
			if (detaching) detach(td);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (28:1) {#each rowHeaders as rowName, i}
function create_each_block(ctx) {
	let tr;
	let td;
	let t0_value = /*rowName*/ ctx[6] + "";
	let t0;
	let t1;
	let t2;
	let each_value_1 = /*columnHeaders*/ ctx[2];
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	return {
		c() {
			tr = element("tr");
			td = element("td");
			t0 = text(t0_value);
			t1 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t2 = space();
			attr(td, "class", "svelte-tpl0qj");
		},
		m(target, anchor) {
			insert(target, tr, anchor);
			append(tr, td);
			append(td, t0);
			append(tr, t1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(tr, null);
			}

			append(tr, t2);
		},
		p(ctx, dirty) {
			if (dirty & /*rowHeaders*/ 2 && t0_value !== (t0_value = /*rowName*/ ctx[6] + "")) set_data(t0, t0_value);

			if (dirty & /*colorMap, data, onPointHovered, columnHeaders, rowHeaders*/ 31) {
				each_value_1 = /*columnHeaders*/ ctx[2];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(tr, t2);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_1.length;
			}
		},
		d(detaching) {
			if (detaching) detach(tr);
			destroy_each(each_blocks, detaching);
		}
	};
}

function create_fragment$1(ctx) {
	let table;
	let tr;
	let td;
	let t1;
	let t2;
	let each_value_2 = /*columnHeaders*/ ctx[2];
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	let each_value = /*rowHeaders*/ ctx[1];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			table = element("table");
			tr = element("tr");
			td = element("td");
			td.textContent = "\\";
			t1 = space();

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t2 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(td, "class", "svelte-tpl0qj");
			attr(table, "class", "svelte-tpl0qj");
		},
		m(target, anchor) {
			insert(target, table, anchor);
			append(table, tr);
			append(tr, td);
			append(tr, t1);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(tr, null);
			}

			append(table, t2);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(table, null);
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*columnHeaders*/ 4) {
				each_value_2 = /*columnHeaders*/ ctx[2];
				let i;

				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_2(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(tr, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_2.length;
			}

			if (dirty & /*columnHeaders, colorMap, data, onPointHovered, rowHeaders*/ 31) {
				each_value = /*rowHeaders*/ ctx[1];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(table, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(table);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { data } = $$props;
	let { rowHeaders } = $$props;
	let { columnHeaders } = $$props;
	let { colorMap } = $$props;
	const dispatch = createEventDispatcher();

	const onPointHovered = payload => {
		dispatch('pointhovered', payload);
	};

	$$self.$$set = $$props => {
		if ('data' in $$props) $$invalidate(0, data = $$props.data);
		if ('rowHeaders' in $$props) $$invalidate(1, rowHeaders = $$props.rowHeaders);
		if ('columnHeaders' in $$props) $$invalidate(2, columnHeaders = $$props.columnHeaders);
		if ('colorMap' in $$props) $$invalidate(3, colorMap = $$props.colorMap);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*data*/ 1) {
			$$invalidate(0, data = data || []);
		}

		if ($$self.$$.dirty & /*rowHeaders*/ 2) {
			$$invalidate(1, rowHeaders = rowHeaders || []);
		}

		if ($$self.$$.dirty & /*columnHeaders*/ 4) {
			$$invalidate(2, columnHeaders = columnHeaders || []);
		}

		if ($$self.$$.dirty & /*colorMap*/ 8) {
			$$invalidate(3, colorMap = colorMap || []);
		}
	};

	return [data, rowHeaders, columnHeaders, colorMap, onPointHovered];
}

class HeatGrid extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$1,
			create_fragment$1,
			safe_not_equal,
			{
				data: 0,
				rowHeaders: 1,
				columnHeaders: 2,
				colorMap: 3
			},
			add_css$1
		);
	}
}

/* src/lib/components/Slide1.svelte generated by Svelte v3.51.0 */

function add_css(target) {
	append_styles(target, "svelte-rn042o", "div.svelte-rn042o{font-family:sans-serif;width:800px;height:150px;display:grid;grid-template-columns:50% 50%}");
}

function create_fragment(ctx) {
	let div;
	let heatgrid;
	let current;

	heatgrid = new HeatGrid({
			props: {
				columnHeaders: ['col1', 'col2', 'col3', 'col4'],
				rowHeaders: [
					'row 1',
					'row 2',
					'row 3',
					'row 4',
					'row 5',
					'row 6',
					'row 7',
					'row 8',
					'row 9',
					'row 10'
				],
				data: [
					[0, 1, 2, 3],
					[1, 2, 3, 0],
					[2, 3, 0, 1],
					[3, 0, 1, 2],
					[0, 1, 2, 3],
					[1, 2, 3, 0],
					[2, 3, 0, 1],
					[3, 0, 1, 2],
					[0, 1, 2, 3],
					[1, 2, 3, 0]
				],
				colorMap: ['silver', 'cyan', 'yellow', 'red']
			}
		});

	heatgrid.$on("pointhovered", /*pointhovered_handler*/ ctx[1]);

	return {
		c() {
			div = element("div");
			create_component(heatgrid.$$.fragment);
			attr(div, "class", "svelte-rn042o");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(heatgrid, div, null);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(heatgrid.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(heatgrid.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(heatgrid);
		}
	};
}

const chart1 = 'https://discovery-hub-open-data.s3.eu-west-2.amazonaws.com/foodtech/test/v2022_10_14_Heat_map.html';
const chart2 = 'https://discovery-hub-open-data.s3.eu-west-2.amazonaws.com/foodtech/test/test_bar_chart.html';
const chart3 = 'https://discovery-hub-open-data.s3.eu-west-2.amazonaws.com/foodtech/test/test_magnitude_vs_growth.html';

function instance($$self, $$props, $$invalidate) {
	const URLs = [
		[chart1, chart2, chart3, chart1],
		[chart2, chart3, chart1, chart2],
		[chart3, chart1, chart2, chart3],
		[chart1, chart2, chart3, chart1],
		[chart2, chart3, chart1, chart2],
		[chart3, chart1, chart2, chart3],
		[chart1, chart2, chart3, chart1],
		[chart2, chart3, chart1, chart2],
		[chart3, chart1, chart2, chart3],
		[chart1, chart2, chart3, chart1]
	];
	let datapoint;

	onMount(() => {
		console.log('posting...');
		globalThis.parent?.postMessage('hello', '*');
		console.log('posted');

		addEventListener(
			'message',
			e => {
				console.log('received');
				var key = e.message ? "message" : "data";
				e[key];
			},
			false
		);
	});

	const pointhovered_handler = ({ detail }) => $$invalidate(0, datapoint = detail);

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*datapoint*/ 1) {
			datapoint && globalThis.parent?.postMessage(
				{
					message: 'setURL',
					source: 'slide1',
					url: URLs[datapoint.i][datapoint.j]
				},
				'*'
			);
		}

		if ($$self.$$.dirty & /*datapoint*/ 1) {
			datapoint && console.log(datapoint, URLs[datapoint.i][datapoint.j]);
		}
	};

	return [datapoint, pointhovered_handler];
}

class Slide1 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {}, add_css);
	}
}

export { Slide1 as default };
//# sourceMappingURL=Slide1.js.map
