<?php
/**
 * Plugin Name: axs4all - AI
 * Description: Manage crawl targets for AI-powered processing with a Tabler-based admin experience.
 * Version: 0.1.2
 * Author: axs4all
 * Text Domain: a4a-ai
 */

if (!defined('ABSPATH')) {
    exit;
}

final class A4A_AI_Plugin {
    const VERSION = '0.1.2';
    const SLUG = 'a4a-ai';
    const CPT = 'a4a_url';

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
        add_action('init', [$this, 'register_post_type']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_menu', [$this, 'register_admin_menu'], 20);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    /**
     * Plugin activation hook.
     */
    public function activate() {
        $this->register_post_type();
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation hook.
     */
    public function deactivate() {
        flush_rewrite_rules();
    }

    /**
     * Registers the custom post type that stores URLs.
     */
    public function register_post_type() {
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

        $hook = null;
        $parent_slug = $this->get_tabler_parent_slug();

        if ($parent_slug) {
            $hook = add_submenu_page(
                $parent_slug,
                __('axs4all - AI', 'a4a-ai'),
                __('axs4all - AI', 'a4a-ai'),
                $capability,
                self::SLUG,
                $callback
            );
        }

        if (!$hook) {
            $hook = add_menu_page(
                __('axs4all - AI', 'a4a-ai'),
                __('axs4all - AI', 'a4a-ai'),
                $capability,
                self::SLUG,
                $callback,
                'dashicons-art',
                66
            );
        }

        if ($hook) {
            $this->admin_hook = $hook;
        }
    }

    /**
     * Attempts to detect an existing Tabler-based parent menu.
     *
     * @return string
     */
    private function get_tabler_parent_slug() {
        $candidates = ['tabler-dashboard', 'tabler-admin'];

        foreach ($candidates as $slug) {
            if ($this->menu_exists($slug)) {
                return $slug;
            }
        }

        return '';
    }

    /**
     * Checks whether a top-level admin menu with the supplied slug exists.
     *
     * @param string $slug
     * @return bool
     */
    private function menu_exists($slug) {
        global $menu;

        if (!is_array($menu)) {
            return false;
        }

        foreach ($menu as $item) {
            if (isset($item[2]) && $item[2] === $slug) {
                return true;
            }
        }

        return false;
    }

    /**
     * Outputs the root element for the Tabler-driven SPA.
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
                'nonce' => wp_create_nonce('wp_rest'),
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

    /**
     * Capability guard for REST endpoints.
     *
     * @return bool
     */
    public function can_manage() {
        return current_user_can('manage_options');
    }

    /**
     * Lists all saved URLs.
     *
     * @return WP_REST_Response
     */
    public function rest_list_urls() {
        $posts = get_posts([
            'post_type' => self::CPT,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'date',
            'order' => 'DESC',
        ]);

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
        $url = esc_url_raw($request->get_param('url'));
        if (empty($url)) {
            return new WP_Error('invalid_url', __('Please provide a valid URL.', 'a4a-ai'), ['status' => 400]);
        }

        $post_id = wp_insert_post([
            'post_type' => self::CPT,
            'post_status' => 'publish',
            'post_title' => $url,
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
        return [
            'id' => (int) $post->ID,
            'url' => (string) get_post_meta($post->ID, '_a4a_url', true),
            'description' => (string) get_post_meta($post->ID, '_a4a_description', true),
            'schedule' => (string) get_post_meta($post->ID, '_a4a_schedule', true),
            'returned_data' => (string) get_post_meta($post->ID, '_a4a_returned_data', true),
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
                    $value = sanitize_textarea_field($value);
                    break;
                case 'returned_data':
                    $value = $this->sanitize_xml_field($value);
                    break;
            }

            update_post_meta($post_id, $meta_key, $value);
        }
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
}

A4A_AI_Plugin::instance();

register_activation_hook(__FILE__, [A4A_AI_Plugin::instance(), 'activate']);
register_deactivation_hook(__FILE__, [A4A_AI_Plugin::instance(), 'deactivate']);
