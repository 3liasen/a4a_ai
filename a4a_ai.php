<?php
/**
 * Plugin Name: axs4all - AI
 * Description: Manage crawl targets for AI-powered processing with a Bootstrap-based admin experience.
 * Version: 0.4.0
 * Author: axs4all
 * Text Domain: a4a-ai
 */

if (!defined('ABSPATH')) {
    exit;
}

final class A4A_AI_Plugin {
    const VERSION = '0.4.0';
    const SLUG = 'a4a-ai';
    const URL_CPT = 'a4a_url';
    const CLIENT_CPT = 'a4a_client';
    const CATEGORY_CPT = 'a4a_category';

    /**
     * @var A4A_AI_Plugin|null
     */
    private static $instance = null;

    /**
     * @var string[]
     */
    private $admin_hooks = [];

    /**
     * Main entry point.
     *
     * @return A4A_AI_Plugin
     */
    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    private function __construct() {
        add_action('init', [$this, 'register_post_types']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_menu', [$this, 'register_admin_menu'], 20);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    /**
     * Plugin activation hook.
     */
    public function activate() {
        $this->register_post_types();
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation hook.
     */
    public function deactivate() {
        flush_rewrite_rules();
    }

    /**
     * Registers custom post types used by the plugin.
     */
    public function register_post_types() {
        $this->register_client_post_type();
        $this->register_url_post_type();
        $this->register_category_post_type();
    }

    private function register_client_post_type() {
        $labels = [
            'name' => __('Clients', 'a4a-ai'),
            'singular_name' => __('Client', 'a4a-ai'),
            'add_new' => __('Add New', 'a4a-ai'),
            'add_new_item' => __('Add New Client', 'a4a-ai'),
            'edit_item' => __('Edit Client', 'a4a-ai'),
            'new_item' => __('New Client', 'a4a-ai'),
            'view_item' => __('View Client', 'a4a-ai'),
            'search_items' => __('Search Clients', 'a4a-ai'),
            'not_found' => __('No clients found.', 'a4a-ai'),
            'not_found_in_trash' => __('No clients found in Trash.', 'a4a-ai'),
        ];

        $args = [
            'labels' => $labels,
            'public' => false,
            'show_ui' => false,
            'show_in_menu' => false,
            'show_in_rest' => false,
            'supports' => ['title'],
            'capability_type' => 'post',
        ];

        register_post_type(self::CLIENT_CPT, $args);
    }

    private function register_url_post_type() {
        $labels = [
            'name' => __('Client URLs', 'a4a-ai'),
            'singular_name' => __('Client URL', 'a4a-ai'),
            'add_new' => __('Add New', 'a4a-ai'),
            'add_new_item' => __('Add New URL', 'a4a-ai'),
            'edit_item' => __('Edit URL', 'a4a-ai'),
            'new_item' => __('New URL', 'a4a-ai'),
            'view_item' => __('View URL', 'a4a-ai'),
            'search_items' => __('Search URLs', 'a4a-ai'),
            'not_found' => __('No URLs found.', 'a4a-ai'),
            'not_found_in_trash' => __('No URLs found in Trash.', 'a4a-ai'),
        ];

        $args = [
            'labels' => $labels,
            'public' => false,
            'show_ui' => false,
            'show_in_menu' => false,
            'show_in_rest' => false,
            'supports' => ['title'],
            'capability_type' => 'post',
        ];

        register_post_type(self::URL_CPT, $args);
    }

    private function register_category_post_type() {
        $labels = [
            'name' => __('Categories', 'a4a-ai'),
            'singular_name' => __('Category', 'a4a-ai'),
            'add_new' => __('Add New', 'a4a-ai'),
            'add_new_item' => __('Add New Category', 'a4a-ai'),
            'edit_item' => __('Edit Category', 'a4a-ai'),
            'new_item' => __('New Category', 'a4a-ai'),
            'view_item' => __('View Category', 'a4a-ai'),
            'search_items' => __('Search Categories', 'a4a-ai'),
            'not_found' => __('No categories found.', 'a4a-ai'),
            'not_found_in_trash' => __('No categories found in Trash.', 'a4a-ai'),
        ];

        $args = [
            'labels' => $labels,
            'public' => false,
            'show_ui' => false,
            'show_in_menu' => false,
            'show_in_rest' => false,
            'supports' => ['title'],
            'capability_type' => 'post',
        ];

        register_post_type(self::CATEGORY_CPT, $args);
    }

    private function store_admin_hook($hook) {
        if ($hook) {
            $this->admin_hooks[] = $hook;
        }
    }

    /**
     * Registers the WordPress admin menu entry and submenus.
     */
    public function register_admin_menu() {
        $capability = 'manage_options';

        $main_hook = add_menu_page(
            __('axs4all - AI', 'a4a-ai'),
            __('axs4all - AI', 'a4a-ai'),
            $capability,
            self::SLUG,
            [$this, 'render_clients_page'],
            'dashicons-art',
            66
        );
        $this->store_admin_hook($main_hook);

        $clients_hook = add_submenu_page(
            self::SLUG,
            __('Clients', 'a4a-ai'),
            __('Clients', 'a4a-ai'),
            $capability,
            self::SLUG,
            [$this, 'render_clients_page']
        );
        $this->store_admin_hook($clients_hook);

        $categories_hook = add_submenu_page(
            self::SLUG,
            __('Categories', 'a4a-ai'),
            __('Categories', 'a4a-ai'),
            $capability,
            self::SLUG . '-categories',
            [$this, 'render_categories_page']
        );
        $this->store_admin_hook($categories_hook);
    }

    public function render_clients_page() {
        $this->render_admin_app('clients');
    }

    public function render_categories_page() {
        $this->render_admin_app('categories');
    }

    /**
     * Outputs the root element for the admin SPA.
     *
     * @param string $default_view
     */
    private function render_admin_app($default_view) {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have permission to access this page.', 'a4a-ai'));
        }

        printf(
            '<div id="a4a-ai-root" data-default-view="%s"></div>',
            esc_attr($default_view)
        );
    }

    /**
     * Enqueues admin assets when an axs4all - AI page is loaded.
     *
     * @param string $hook
     */
    public function enqueue_admin_assets($hook) {
        if (!in_array($hook, $this->admin_hooks, true)) {
            return;
        }

        $handle = 'a4a-ai-admin';
        $script_path = plugin_dir_url(__FILE__) . 'assets/admin.js';

        wp_register_script(
            $handle,
            $script_path,
            [],
            self::VERSION,
            true
        );

        $namespace = 'a4a/v1';
        $config = [
            'nonce' => wp_create_nonce('wp_rest'),
            'assetsUrl' => plugin_dir_url(__FILE__) . 'assets/',
            'version' => self::VERSION,
            'defaultView' => $this->determine_default_view(),
            'endpoints' => [
                'clients' => esc_url_raw(rest_url($namespace . '/clients')),
                'urls' => esc_url_raw(rest_url($namespace . '/urls')),
                'categories' => esc_url_raw(rest_url($namespace . '/categories')),
                'runUrl' => esc_url_raw(rest_url($namespace . '/urls/%d/run')),
            ],
        ];

        wp_localize_script($handle, 'a4aAI', $config);
        wp_enqueue_script($handle);
    }

    /**
     * Determines which view the SPA should activate by default.
     *
     * @return string
     */
    private function determine_default_view() {
        $page = isset($_GET['page']) ? sanitize_key(wp_unslash($_GET['page'])) : self::SLUG; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

        if ($page === self::SLUG . '-categories') {
            return 'categories';
        }

        return 'clients';
    }

    /**
     * Registers REST API routes.
     */
    public function register_rest_routes() {
        $namespace = 'a4a/v1';

        register_rest_route(
            $namespace,
            '/clients',
            [
                [
                    'methods' => WP_REST_Server::READABLE,
                    'callback' => [$this, 'rest_list_clients'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
                [
                    'methods' => WP_REST_Server::CREATABLE,
                    'callback' => [$this, 'rest_create_client'],
                    'permission_callback' => [$this, 'can_manage'],
                    'args' => $this->client_args(),
                ],
            ]
        );

        register_rest_route(
            $namespace,
            '/clients/(?P<id>\d+)',
            [
                [
                    'methods' => WP_REST_Server::READABLE,
                    'callback' => [$this, 'rest_get_client'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
                [
                    'methods' => WP_REST_Server::EDITABLE,
                    'callback' => [$this, 'rest_update_client'],
                    'permission_callback' => [$this, 'can_manage'],
                    'args' => $this->client_args(true),
                ],
                [
                    'methods' => WP_REST_Server::DELETABLE,
                    'callback' => [$this, 'rest_delete_client'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
            ]
        );

        register_rest_route(
            $namespace,
            '/clients/(?P<client_id>\d+)/urls',
            [
                [
                    'methods' => WP_REST_Server::READABLE,
                    'callback' => [$this, 'rest_list_client_urls'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
                [
                    'methods' => WP_REST_Server::CREATABLE,
                    'callback' => [$this, 'rest_create_url'],
                    'permission_callback' => [$this, 'can_manage'],
                    'args' => $this->url_args(false, true),
                ],
            ]
        );

        register_rest_route(
            $namespace,
            '/urls',
            [
                [
                    'methods' => WP_REST_Server::READABLE,
                    'callback' => [$this, 'rest_list_urls'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
                [
                    'methods' => WP_REST_Server::CREATABLE,
                    'callback' => [$this, 'rest_create_url'],
                    'permission_callback' => [$this, 'can_manage'],
                    'args' => $this->url_args(),
                ],
            ]
        );

        register_rest_route(
            $namespace,
            '/urls/(?P<id>\d+)',
            [
                [
                    'methods' => WP_REST_Server::READABLE,
                    'callback' => [$this, 'rest_get_url'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
                [
                    'methods' => WP_REST_Server::EDITABLE,
                    'callback' => [$this, 'rest_update_url'],
                    'permission_callback' => [$this, 'can_manage'],
                    'args' => $this->url_args(true),
                ],
                [
                    'methods' => WP_REST_Server::DELETABLE,
                    'callback' => [$this, 'rest_delete_url'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
            ]
        );

        register_rest_route(
            $namespace,
            '/urls/(?P<id>\d+)/run',
            [
                [
                    'methods' => WP_REST_Server::CREATABLE,
                    'callback' => [$this, 'rest_run_url_now'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
            ]
        );

        register_rest_route(
            $namespace,
            '/categories',
            [
                [
                    'methods' => WP_REST_Server::READABLE,
                    'callback' => [$this, 'rest_list_categories'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
                [
                    'methods' => WP_REST_Server::CREATABLE,
                    'callback' => [$this, 'rest_create_category'],
                    'permission_callback' => [$this, 'can_manage'],
                    'args' => $this->category_args(),
                ],
            ]
        );

        register_rest_route(
            $namespace,
            '/categories/(?P<id>\d+)',
            [
                [
                    'methods' => WP_REST_Server::READABLE,
                    'callback' => [$this, 'rest_get_category'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
                [
                    'methods' => WP_REST_Server::EDITABLE,
                    'callback' => [$this, 'rest_update_category'],
                    'permission_callback' => [$this, 'can_manage'],
                    'args' => $this->category_args(true),
                ],
                [
                    'methods' => WP_REST_Server::DELETABLE,
                    'callback' => [$this, 'rest_delete_category'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
            ]
        );
    }

    private function client_args($partial = false) {
        $required = !$partial;

        return [
            'name' => [
                'required' => $required,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'notes' => [
                'required' => false,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_textarea_field',
            ],
            'with_urls' => [
                'required' => false,
                'type' => 'boolean',
            ],
        ];
    }

    private function category_args($partial = false) {
        $required = !$partial;

        return [
            'name' => [
                'required' => $required,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'options' => [
                'required' => false,
                'type' => 'array',
                'sanitize_callback' => [$this, 'sanitize_category_options'],
            ],
        ];
    }

    private function url_args($partial = false, $from_client_route = false) {
        $client_required = !$partial && !$from_client_route;

        return [
            'client_id' => [
                'required' => $client_required,
                'type' => 'integer',
                'sanitize_callback' => 'absint',
                'validate_callback' => [$this, 'validate_client_id'],
            ],
            'url' => [
                'required' => !$partial,
                'type' => 'string',
                'sanitize_callback' => 'esc_url_raw',
            ],
            'description' => [
                'required' => false,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_textarea_field',
            ],
            'schedule' => [
                'required' => false,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_textarea_field',
            ],
            'prompt' => [
                'required' => false,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_textarea_field',
            ],
            'returned_data' => [
                'required' => false,
                'type' => 'string',
                'sanitize_callback' => [$this, 'sanitize_xml_field'],
            ],
        ];
    }

    /**
     * Capability guard for REST endpoints.
     *
     * @return bool
     */
    public function can_manage() {
        return current_user_can('manage_options');
    }

    /**
     * Lists all clients.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function rest_list_clients($request) {
        $with_urls = (bool) $request->get_param('with_urls');

        $posts = get_posts([
            'post_type' => self::CLIENT_CPT,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
        ]);

        $items = array_map(
            function ($post) use ($with_urls) {
                return $this->map_client_to_item($post, $with_urls);
            },
            $posts
        );

        return rest_ensure_response($items);
    }

    /**
     * Retrieves a single client.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_get_client($request) {
        $post = $this->get_client_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        $with_urls = (bool) $request->get_param('with_urls');

        return rest_ensure_response($this->map_client_to_item($post, $with_urls));
    }

    /**
     * Creates a new client.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_create_client($request) {
        $name = $request->get_param('name');
        if (empty($name)) {
            return new WP_Error('invalid_client_name', __('Client name is required.', 'a4a-ai'), ['status' => 400]);
        }

        $post_id = wp_insert_post([
            'post_type' => self::CLIENT_CPT,
            'post_status' => 'publish',
            'post_title' => sanitize_text_field($name),
        ], true);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        $this->persist_client_meta($post_id, $request);

        $post = get_post($post_id);

        return rest_ensure_response($this->map_client_to_item($post));
    }

    /**
     * Updates an existing client.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_update_client($request) {
        $post = $this->get_client_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        $name = $request->get_param('name');
        if (null !== $name) {
            $name = sanitize_text_field($name);
            if ($name === '') {
                return new WP_Error('invalid_client_name', __('Client name cannot be empty.', 'a4a-ai'), ['status' => 400]);
            }

            wp_update_post([
                'ID' => $post->ID,
                'post_title' => $name,
            ]);
        }

        $this->persist_client_meta($post->ID, $request, true);

        $updated = get_post($post->ID);

        return rest_ensure_response($this->map_client_to_item($updated));
    }

    /**
     * Deletes a client and its URLs.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_delete_client($request) {
        $post = $this->get_client_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        $child_urls = get_posts([
            'post_type' => self::URL_CPT,
            'post_status' => 'any',
            'posts_per_page' => -1,
            'fields' => 'ids',
            'meta_query' => [
                [
                    'key' => '_a4a_client_id',
                    'value' => $post->ID,
                    'compare' => '=',
                ],
            ],
        ]);

        if (is_array($child_urls)) {
            foreach ($child_urls as $url_id) {
                wp_delete_post($url_id, true);
            }
        }

        $deleted = wp_delete_post($post->ID, true);
        if (!$deleted) {
            return new WP_Error('delete_failed', __('Could not delete the client.', 'a4a-ai'), ['status' => 500]);
        }

        return rest_ensure_response(['deleted' => true]);
    }

    /**
     * Lists URLs for a specific client.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function rest_list_client_urls($request) {
        $request->set_param('client_id', absint($request->get_param('client_id')));

        return $this->rest_list_urls($request);
    }

    /**
     * Lists URLs across clients or filtered by client.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function rest_list_urls($request) {
        $client_id = absint($request->get_param('client_id'));

        $args = [
            'post_type' => self::URL_CPT,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'date',
            'order' => 'DESC',
        ];

        if ($client_id > 0) {
            $args['meta_query'] = [
                [
                    'key' => '_a4a_client_id',
                    'value' => $client_id,
                    'compare' => '=',
                ],
            ];
        }

        $posts = get_posts($args);
        $items = array_map([$this, 'map_url_to_item'], $posts);

        return rest_ensure_response($items);
    }

    /**
     * Retrieves a single URL.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_get_url($request) {
        $post = $this->get_url_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        return rest_ensure_response($this->map_url_to_item($post));
    }

    /**
     * Creates a URL for a client.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_create_url($request) {
        $client_id = absint($request->get_param('client_id'));
        if ($client_id < 1) {
            return new WP_Error('invalid_client', __('A valid client is required for the URL.', 'a4a-ai'), ['status' => 400]);
        }

        if (!$this->validate_client_id($client_id)) {
            return new WP_Error('invalid_client', __('The selected client does not exist.', 'a4a-ai'), ['status' => 404]);
        }

        $url_value = esc_url_raw($request->get_param('url'));
        if (empty($url_value)) {
            return new WP_Error('invalid_url', __('Please provide a valid URL.', 'a4a-ai'), ['status' => 400]);
        }

        $post_id = wp_insert_post([
            'post_type' => self::URL_CPT,
            'post_status' => 'publish',
            'post_title' => $url_value,
            'post_parent' => $client_id,
        ], true);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        update_post_meta($post_id, '_a4a_client_id', $client_id);
        $this->persist_url_meta($post_id, $request);

        $post = get_post($post_id);

        return rest_ensure_response($this->map_url_to_item($post));
    }

    /**
     * Updates an existing URL.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_update_url($request) {
        $post = $this->get_url_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        $client_id = $request->get_param('client_id');
        if (null !== $client_id) {
            $client_id = absint($client_id);
            if ($client_id < 1 || !$this->validate_client_id($client_id)) {
                return new WP_Error('invalid_client', __('The selected client does not exist.', 'a4a-ai'), ['status' => 404]);
            }

            update_post_meta($post->ID, '_a4a_client_id', $client_id);
            wp_update_post([
                'ID' => $post->ID,
                'post_parent' => $client_id,
            ]);
        }

        $url_value = $request->get_param('url');
        if (null !== $url_value) {
            $url_value = esc_url_raw($url_value);
            if (empty($url_value)) {
                return new WP_Error('invalid_url', __('Please provide a valid URL.', 'a4a-ai'), ['status' => 400]);
            }

            wp_update_post([
                'ID' => $post->ID,
                'post_title' => $url_value,
            ]);
        }

        $this->persist_url_meta($post->ID, $request, true);

        $updated = get_post($post->ID);

        return rest_ensure_response($this->map_url_to_item($updated));
    }

    /**
     * Deletes a URL entry.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_delete_url($request) {
        $post = $this->get_url_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        $deleted = wp_delete_post($post->ID, true);
        if (!$deleted) {
            return new WP_Error('delete_failed', __('Could not delete the URL.', 'a4a-ai'), ['status' => 500]);
        }

        return rest_ensure_response(['deleted' => true]);
    }

    /**
     * Flags a URL for immediate processing.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_run_url_now($request) {
        $post = $this->get_url_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        $timestamp = current_time('mysql', true);

        update_post_meta($post->ID, '_a4a_run_requested_gmt', $timestamp);

        $updated = get_post($post->ID);
        $item = $this->map_url_to_item($updated);
        $item['run_requested_gmt'] = $timestamp;

        return rest_ensure_response($item);
    }

    /**
     * Lists categories.
     *
     * @return WP_REST_Response
     */
    public function rest_list_categories() {
        $posts = get_posts([
            'post_type' => self::CATEGORY_CPT,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
        ]);

        $items = array_map([$this, 'map_category_to_item'], $posts);

        return rest_ensure_response($items);
    }

    /**
     * Retrieves a single category.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_get_category($request) {
        $post = $this->get_category_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        return rest_ensure_response($this->map_category_to_item($post));
    }

    /**
     * Creates a new category.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_create_category($request) {
        $name = $request->get_param('name');
        if (empty($name)) {
            return new WP_Error('invalid_category_name', __('Category name is required.', 'a4a-ai'), ['status' => 400]);
        }

        $post_id = wp_insert_post([
            'post_type' => self::CATEGORY_CPT,
            'post_status' => 'publish',
            'post_title' => sanitize_text_field($name),
        ], true);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        $this->persist_category_meta($post_id, $request);

        $post = get_post($post_id);

        return rest_ensure_response($this->map_category_to_item($post));
    }

    /**
     * Updates an existing category.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_update_category($request) {
        $post = $this->get_category_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        $name = $request->get_param('name');
        if (null !== $name) {
            $name = sanitize_text_field($name);
            if ($name === '') {
                return new WP_Error('invalid_category_name', __('Category name cannot be empty.', 'a4a-ai'), ['status' => 400]);
            }

            wp_update_post([
                'ID' => $post->ID,
                'post_title' => $name,
            ]);
        }

        $this->persist_category_meta($post->ID, $request, true);

        $updated = get_post($post->ID);

        return rest_ensure_response($this->map_category_to_item($updated));
    }

    /**
     * Deletes a category.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_delete_category($request) {
        $post = $this->get_category_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        $deleted = wp_delete_post($post->ID, true);
        if (!$deleted) {
            return new WP_Error('delete_failed', __('Could not delete the category.', 'a4a-ai'), ['status' => 500]);
        }

        return rest_ensure_response(['deleted' => true]);
    }

    /**
     * Validates that a client exists.
     *
     * @param mixed $value
     * @return bool
     */
    public function validate_client_id($value) {
        $client_id = absint($value);
        if ($client_id < 1) {
            return false;
        }

        $post = get_post($client_id);

        return $post && $post->post_type === self::CLIENT_CPT;
    }

    /**
     * Maps a client post to an API-ready array.
     *
     * @param WP_Post $post
     * @param bool    $with_urls
     * @return array
     */
    private function map_client_to_item($post, $with_urls = false) {
        $client_id = (int) $post->ID;

        $item = [
            'id' => $client_id,
            'name' => (string) $post->post_title,
            'notes' => (string) get_post_meta($client_id, '_a4a_client_notes', true),
            'created_gmt' => $post->post_date_gmt,
            'modified_gmt' => $post->post_modified_gmt,
            'url_count' => $this->count_urls_for_client($client_id),
        ];

        if ($with_urls) {
            $item['urls'] = $this->get_urls_for_client($client_id);
        }

        return $item;
    }

    /**
     * Persists client-level metadata.
     *
     * @param int             $post_id
     * @param WP_REST_Request $request
     * @param bool            $partial
     */
    private function persist_client_meta($post_id, $request, $partial = false) {
        if ($partial && !$request->offsetExists('notes')) {
            return;
        }

        $notes_raw = $request->get_param('notes');
        $notes = is_string($notes_raw) ? sanitize_textarea_field($notes_raw) : '';

        update_post_meta($post_id, '_a4a_client_notes', $notes);
    }

    /**
     * Counts URLs linked to a client.
     *
     * @param int $client_id
     * @return int
     */
    private function count_urls_for_client($client_id) {
        $urls = get_posts([
            'post_type' => self::URL_CPT,
            'post_status' => 'publish',
            'fields' => 'ids',
            'posts_per_page' => -1,
            'meta_query' => [
                [
                    'key' => '_a4a_client_id',
                    'value' => $client_id,
                    'compare' => '=',
                ],
            ],
        ]);

        return is_array($urls) ? count($urls) : 0;
    }

    /**
     * Fetches URLs for a specific client.
     *
     * @param int $client_id
     * @return array
     */
    private function get_urls_for_client($client_id) {
        $posts = get_posts([
            'post_type' => self::URL_CPT,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'date',
            'order' => 'DESC',
            'meta_query' => [
                [
                    'key' => '_a4a_client_id',
                    'value' => $client_id,
                    'compare' => '=',
                ],
            ],
        ]);

        return array_map([$this, 'map_url_to_item'], $posts);
    }

    /**
     * Maps a URL post to an API-ready array.
     *
     * @param WP_Post $post
     * @return array
     */
    private function map_url_to_item($post) {
        $id = (int) $post->ID;
        $url_value = get_post_meta($id, '_a4a_url', true);
        if ($url_value === '') {
            $url_value = (string) $post->post_title;
        }

        return [
            'id' => $id,
            'client_id' => (int) get_post_meta($id, '_a4a_client_id', true),
            'url' => (string) $url_value,
            'description' => (string) get_post_meta($id, '_a4a_description', true),
            'schedule' => (string) get_post_meta($id, '_a4a_schedule', true),
            'prompt' => (string) get_post_meta($id, '_a4a_prompt', true),
            'returned_data' => (string) get_post_meta($id, '_a4a_returned_data', true),
            'run_requested_gmt' => (string) get_post_meta($id, '_a4a_run_requested_gmt', true),
            'modified_gmt' => $post->post_modified_gmt,
        ];
    }

    /**
     * Persists URL metadata.
     *
     * @param int             $post_id
     * @param WP_REST_Request $request
     * @param bool            $partial
     */
    private function persist_url_meta($post_id, $request, $partial = false) {
        $meta_map = [
            'url' => '_a4a_url',
            'description' => '_a4a_description',
            'schedule' => '_a4a_schedule',
            'prompt' => '_a4a_prompt',
            'returned_data' => '_a4a_returned_data',
        ];

        foreach ($meta_map as $param => $meta_key) {
            if ($partial && !$request->offsetExists($param)) {
                continue;
            }

            $value = $request->get_param($param);
            switch ($param) {
                case 'url':
                    $value = esc_url_raw($value);
                    break;
                case 'description':
                case 'schedule':
                case 'prompt':
                    $value = is_string($value) ? sanitize_textarea_field($value) : '';
                    break;
                case 'returned_data':
                    $value = $this->sanitize_xml_field($value);
                    break;
            }

            update_post_meta($post_id, $meta_key, $value);
        }
    }

    /**
     * Maps a category post to an API-ready array.
     *
     * @param WP_Post $post
     * @return array
     */
    private function map_category_to_item($post) {
        $id = (int) $post->ID;
        $raw_options = get_post_meta($id, '_a4a_category_options', true);

        if (!is_array($raw_options)) {
            $raw_options = [];
        }

        $options = [];
        foreach ($raw_options as $option) {
            $text = is_string($option) ? $option : (is_numeric($option) ? (string) $option : '');
            $text = trim($text);
            if ($text !== '') {
                $options[] = $text;
            }
        }

        return [
            'id' => $id,
            'name' => (string) $post->post_title,
            'options' => $options,
            'created_gmt' => $post->post_date_gmt,
            'modified_gmt' => $post->post_modified_gmt,
        ];
    }

    /**
     * Persists category metadata.
     *
     * @param int             $post_id
     * @param WP_REST_Request $request
     * @param bool            $partial
     */
    private function persist_category_meta($post_id, $request, $partial = false) {
        if ($partial && !$request->offsetExists('options')) {
            return;
        }

        $options = $this->sanitize_category_options($request->get_param('options'));

        update_post_meta($post_id, '_a4a_category_options', $options);
    }

    /**
     * Sanitises the category options array.
     *
     * @param mixed $value
     * @return array
     */
    public function sanitize_category_options($value) {
        if (!is_array($value)) {
            return [];
        }

        $options = [];
        foreach ($value as $option) {
            if (!is_scalar($option)) {
                continue;
            }

            $text = sanitize_text_field(wp_unslash((string) $option));
            if ($text !== '') {
                $options[] = $text;
            }
        }

        return array_values(array_unique($options));
    }

    /**
     * Attempts to sanitise XML without stripping tags.
     *
     * @param string|null $value
     * @return string
     */
    public function sanitize_xml_field($value) {
        if (!is_string($value)) {
            return '';
        }

        $value = wp_check_invalid_utf8($value, true);

        return trim($value);
    }

    /**
     * Resolves the client entity from the incoming REST request.
     *
     * @param WP_REST_Request $request
     * @return WP_Post|WP_Error
     */
    private function get_client_from_request($request) {
        $id = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::CLIENT_CPT) {
            return new WP_Error('not_found', __('Client not found.', 'a4a-ai'), ['status' => 404]);
        }

        return $post;
    }

    /**
     * Resolves the URL entity from the incoming REST request.
     *
     * @param WP_REST_Request $request
     * @return WP_Post|WP_Error
     */
    private function get_url_from_request($request) {
        $id = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::URL_CPT) {
            return new WP_Error('not_found', __('URL not found.', 'a4a-ai'), ['status' => 404]);
        }

        return $post;
    }

    /**
     * Resolves the category entity from the incoming REST request.
     *
     * @param WP_REST_Request $request
     * @return WP_Post|WP_Error
     */
    private function get_category_from_request($request) {
        $id = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::CATEGORY_CPT) {
            return new WP_Error('not_found', __('Category not found.', 'a4a-ai'), ['status' => 404]);
        }

        return $post;
    }
}

A4A_AI_Plugin::instance();

register_activation_hook(__FILE__, [A4A_AI_Plugin::instance(), 'activate']);
register_deactivation_hook(__FILE__, [A4A_AI_Plugin::instance(), 'deactivate']);
