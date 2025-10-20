<?php
/**
 * Plugin Name: axs4all - AI
 * Description: Manage crawl targets for AI-powered processing with a Bootstrap-based admin experience.
 * Version: 0.3.2
 * Author: axs4all
 * Text Domain: a4a-ai
 */

if (!defined('ABSPATH')) {
    exit;
}

final class A4A_AI_Plugin {
    const VERSION = '0.3.1';
    const SLUG = 'a4a-ai';
    const CPT = 'a4a_url';
    const CLIENT_CPT = 'a4a_client';
    const CATEGORY_CPT = 'a4a_category';

    /**
     * @var A4A_AI_Plugin|null
     */
    private static $instance = null;

    /**
     * @var string
     */
    private $admin_hook = '';

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
        $this->register_category_post_type();
        $this->register_url_post_type();
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

    /**
     * Registers the custom post type that stores URLs.
     */
    private function register_url_post_type() {
        $labels = [
            'name' => __('AI URLs', 'a4a-ai'),
            'singular_name' => __('AI URL', 'a4a-ai'),
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

        register_post_type(self::CPT, $args);
    }

    /**
     * Registers the WordPress admin menu entry.
     */
    public function register_admin_menu() {
        $capability = 'manage_options';
        $callback = [$this, 'render_admin_app'];

        $hook = add_menu_page(
            __('axs4all - AI', 'a4a-ai'),
            __('axs4all - AI', 'a4a-ai'),
            $capability,
            self::SLUG,
            $callback,
            'dashicons-art',
            66
        );

        if ($hook) {
            $this->admin_hook = $hook;
        }
    }

    /**
     * Outputs the root element for the Bootstrap-powered SPA.
     */
    public function render_admin_app() {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have permission to access this page.', 'a4a-ai'));
        }

        echo '<div id="a4a-ai-root"></div>';
    }

    /**
     * Enqueues admin assets when our page is loaded.
     *
     * @param string $hook
     */
    public function enqueue_admin_assets($hook) {
        if (empty($this->admin_hook) || $hook !== $this->admin_hook) {
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

        wp_localize_script(
            $handle,
            'a4aAI',
            [
                'restUrl' => esc_url_raw(rest_url('a4a/v1/urls')),
                'clientsRestUrl' => esc_url_raw(rest_url('a4a/v1/clients')),
                'categoriesRestUrl' => esc_url_raw(rest_url('a4a/v1/categories')),
                'runUrlTemplate' => esc_url_raw(rest_url('a4a/v1/urls/%d/run')),
                'nonce' => wp_create_nonce('wp_rest'),
                'assetsUrl' => plugin_dir_url(__FILE__) . 'assets/',
                'version' => self::VERSION,
            ]
        );

        wp_enqueue_script($handle);
    }

    /**
     * Registers REST API routes for managing URLs.
     */
    public function register_rest_routes() {
        register_rest_route(
            'a4a/v1',
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
                    'args' => $this->rest_args(),
                ],
            ]
        );

        register_rest_route(
            'a4a/v1',
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
                    'args' => $this->rest_args(true),
                ],
                [
                    'methods' => WP_REST_Server::DELETABLE,
                    'callback' => [$this, 'rest_delete_url'],
                    'permission_callback' => [$this, 'can_manage'],
                ],
            ]
        );

        register_rest_route(
            'a4a/v1',
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
            'a4a/v1',
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
            'a4a/v1',
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
            'a4a/v1',
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
            'a4a/v1',
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

    /**
     * REST argument schema.
     *
     * @param bool $partial
     * @return array
     */
    private function rest_args($partial = false) {
        $required = !$partial;

        return [
            'client_id' => [
                'required' => false,
                'type' => 'integer',
                'sanitize_callback' => 'absint',
                'validate_callback' => [$this, 'validate_client_param'],
            ],
            'url' => [
                'required' => $required,
                'type' => 'string',
                'validate_callback' => function ($value) {
                    return (bool) filter_var($value, FILTER_VALIDATE_URL);
                },
            ],
            'description' => [
                'required' => false,
                'type' => 'string',
            ],
            'prompt' => [
                'required' => false,
                'type' => 'string',
            ],
            'schedule' => [
                'required' => false,
                'type' => 'string',
            ],
            'returned_data' => [
                'required' => false,
                'type' => 'string',
            ],
        ];
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

    /**
     * Capability guard for REST endpoints.
     *
     * @return bool
     */
    public function can_manage() {
        return current_user_can('manage_options');
    }

    /**
     * Validates an incoming client reference.
     *
     * @param mixed $value
     * @return bool
     */
    public function validate_client_param($value) {
        $client_id = absint($value);
        if ($client_id === 0) {
            return true;
        }

        $post = get_post($client_id);

        return $post && $post->post_type === self::CLIENT_CPT;
    }

    /**
     * Lists all saved URLs.
     *
     * @return WP_REST_Response
     */
    public function rest_list_urls($request = null) {
        $client_id = $request ? absint($request->get_param('client_id')) : 0;

        $args = [
            'post_type' => self::CPT,
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

        $items = array_map([$this, 'map_post_to_item'], $posts);

        return rest_ensure_response($items);
    }

    /**
     * Creates a new URL entry.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_create_url($request) {
        $client_id = absint($request->get_param('client_id'));
        if ($client_id > 0 && !$this->validate_client_param($client_id)) {
            return new WP_Error('invalid_client', __('Selected client does not exist.', 'a4a-ai'), ['status' => 404]);
        }

        $url = esc_url_raw($request->get_param('url'));
        if (empty($url)) {
            return new WP_Error('invalid_url', __('Please provide a valid URL.', 'a4a-ai'), ['status' => 400]);
        }

        $post_id = wp_insert_post([
            'post_type' => self::CPT,
            'post_status' => 'publish',
            'post_title' => $url,
            'post_parent' => $client_id,
        ], true);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        $this->persist_meta($post_id, $request);

        $post = get_post($post_id);

        return rest_ensure_response($this->map_post_to_item($post));
    }

    /**
     * Retrieves a single URL entry.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_get_url($request) {
        $post = $this->get_post_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        return rest_ensure_response($this->map_post_to_item($post));
    }

    /**
     * Updates an existing URL entry.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_update_url($request) {
        $post = $this->get_post_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        if ($request->offsetExists('client_id')) {
            $client_id = absint($request->get_param('client_id'));
            if ($client_id > 0 && !$this->validate_client_param($client_id)) {
                return new WP_Error('invalid_client', __('Selected client does not exist.', 'a4a-ai'), ['status' => 404]);
            }
        }

        $url = $request->get_param('url');
        if (null !== $url) {
            $url = esc_url_raw($url);
            if (empty($url)) {
                return new WP_Error('invalid_url', __('Please provide a valid URL.', 'a4a-ai'), ['status' => 400]);
            }

            wp_update_post([
                'ID' => $post->ID,
                'post_title' => $url,
            ]);
        }

        $this->persist_meta($post->ID, $request, true);

        $updated = get_post($post->ID);

        return rest_ensure_response($this->map_post_to_item($updated));
    }

    /**
     * Deletes a URL entry.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_delete_url($request) {
        $post = $this->get_post_from_request($request);
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
     * Maps a post object to an API-ready array.
     *
     * @param WP_Post $post
     * @return array
     */
    private function map_post_to_item($post) {
        $url_value = get_post_meta($post->ID, '_a4a_url', true);
        if ($url_value === '') {
            $url_value = (string) $post->post_title;
        }

        return [
            'id' => (int) $post->ID,
            'client_id' => (int) get_post_meta($post->ID, '_a4a_client_id', true),
            'url' => (string) $url_value,
            'description' => (string) get_post_meta($post->ID, '_a4a_description', true),
            'schedule' => (string) get_post_meta($post->ID, '_a4a_schedule', true),
            'prompt' => (string) get_post_meta($post->ID, '_a4a_prompt', true),
            'returned_data' => (string) get_post_meta($post->ID, '_a4a_returned_data', true),
            'run_requested_gmt' => (string) get_post_meta($post->ID, '_a4a_run_requested_gmt', true),
            'modified_gmt' => $post->post_modified_gmt,
        ];
    }

    /**
     * Stores meta fields for the URL post.
     *
     * @param int             $post_id
     * @param WP_REST_Request $request
     * @param bool            $partial
     */
    private function persist_meta($post_id, $request, $partial = false) {
        $meta_map = [
            'url' => '_a4a_url',
            'description' => '_a4a_description',
            'schedule' => '_a4a_schedule',
            'prompt' => '_a4a_prompt',
            'returned_data' => '_a4a_returned_data',
            'client_id' => '_a4a_client_id',
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
                    $value = sanitize_textarea_field($value);
                    break;
                case 'returned_data':
                    $value = $this->sanitize_xml_field($value);
                    break;
                case 'client_id':
                    $value = absint($value);
                    if ($value > 0 && !$this->validate_client_param($value)) {
                        $value = 0;
                    }
                    update_post_meta($post_id, $meta_key, $value);
                    wp_update_post([
                        'ID' => $post_id,
                        'post_parent' => $value,
                    ]);
                    continue 2;
            }

            update_post_meta($post_id, $meta_key, $value);
        }
    }

    /**
     * Flags a URL for immediate processing.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_run_url_now($request) {
        $post = $this->get_post_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        $timestamp = current_time('mysql', true);
        update_post_meta($post->ID, '_a4a_run_requested_gmt', $timestamp);

        $updated = get_post($post->ID);

        return rest_ensure_response($this->map_post_to_item($updated));
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
        $name = sanitize_text_field($request->get_param('name'));
        if ($name === '') {
            return new WP_Error('invalid_client_name', __('Client name is required.', 'a4a-ai'), ['status' => 400]);
        }

        $post_id = wp_insert_post([
            'post_type' => self::CLIENT_CPT,
            'post_status' => 'publish',
            'post_title' => $name,
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

        if ($request->offsetExists('name')) {
            $name = sanitize_text_field($request->get_param('name'));
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
     * Deletes a client and associated URLs.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function rest_delete_client($request) {
        $post = $this->get_client_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        $urls = get_posts([
            'post_type' => self::CPT,
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

        if (!empty($urls)) {
            foreach ($urls as $url_id) {
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
     * Lists all categories.
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
        $name = sanitize_text_field($request->get_param('name'));
        if ($name === '') {
            return new WP_Error('invalid_category_name', __('Category name is required.', 'a4a-ai'), ['status' => 400]);
        }

        $post_id = wp_insert_post([
            'post_type' => self::CATEGORY_CPT,
            'post_status' => 'publish',
            'post_title' => $name,
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

        if ($request->offsetExists('name')) {
            $name = sanitize_text_field($request->get_param('name'));
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
     * Persists client meta data.
     *
     * @param int             $post_id
     * @param WP_REST_Request $request
     * @param bool            $partial
     */
    private function persist_client_meta($post_id, $request, $partial = false) {
        if ($partial && !$request->offsetExists('notes')) {
            return;
        }

        $notes = $request->get_param('notes');
        $notes = is_string($notes) ? sanitize_textarea_field($notes) : '';

        update_post_meta($post_id, '_a4a_client_notes', $notes);
    }

    /**
     * Maps a client post to an array.
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
     * Counts URLs assigned to a client.
     *
     * @param int $client_id
     * @return int
     */
    private function count_urls_for_client($client_id) {
        $urls = get_posts([
            'post_type' => self::CPT,
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
     * Retrieves URLs for a given client.
     *
     * @param int $client_id
     * @return array
     */
    private function get_urls_for_client($client_id) {
        $posts = get_posts([
            'post_type' => self::CPT,
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

        return array_map([$this, 'map_post_to_item'], $posts);
    }

    /**
     * Persists category option data.
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
     * Maps a category post to an array.
     *
     * @param WP_Post $post
     * @return array
     */
    private function map_category_to_item($post) {
        $options = get_post_meta($post->ID, '_a4a_category_options', true);
        if (!is_array($options)) {
            $options = [];
        }

        return [
            'id' => (int) $post->ID,
            'name' => (string) $post->post_title,
            'options' => $this->sanitize_category_options($options),
            'created_gmt' => $post->post_date_gmt,
            'modified_gmt' => $post->post_modified_gmt,
        ];
    }

    /**
     * Sanitises category options.
     *
     * @param mixed $value
     * @return array
     */
    public function sanitize_category_options($value) {
        if (!is_array($value)) {
            return [];
        }

        $sanitised = [];
        foreach ($value as $option) {
            if (!is_scalar($option)) {
                continue;
            }

            $text = sanitize_text_field(wp_unslash((string) $option));
            if ($text !== '') {
                $sanitised[] = $text;
            }
        }

        return array_values(array_unique($sanitised));
    }

    /**
     * Attempts to sanitize XML without stripping tags.
     *
     * @param string|null $value
     * @return string
     */
    private function sanitize_xml_field($value) {
        if (!is_string($value)) {
            return '';
        }

        $value = wp_check_invalid_utf8($value, true);

        return trim($value);
    }

    /**
     * Resolves the post entity from the incoming REST request.
     *
     * @param WP_REST_Request $request
     * @return WP_Post|WP_Error
     */
    private function get_post_from_request($request) {
        $id = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::CPT) {
            return new WP_Error('not_found', __('URL not found.', 'a4a-ai'), ['status' => 404]);
        }

        return $post;
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
