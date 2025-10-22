
    public function validate_client_param($value) {
        $client_id = absint($value);
        if ($client_id === 0) {
            return true;
        }

        $post = get_post($client_id);

        return $post && $post->post_type === self::CLIENT_CPT;
    }
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
            'last_run_gmt' => (string) get_post_meta($post->ID, '_a4a_last_run_gmt', true),
            'modified_gmt' => $post->post_modified_gmt,
        ];
    }
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
    private function execute_crawl($post) {
        $settings = $this->get_plugin_settings();
        if (empty($settings['api_key'])) {
            return new WP_Error('missing_ai_credentials', __('AI credentials are not configured. Add an API key in Settings before running crawls.', 'a4a-ai'), ['status' => 400]);
        }

        $url = get_post_meta($post->ID, '_a4a_url', true);
        if ($url === '') {
            $url = (string) $post->post_title;
        }
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return new WP_Error('invalid_url', __('Stored URL is invalid.', 'a4a-ai'), ['status' => 400]);
        }

        $response = wp_remote_get($url, [
            'timeout' => 20,
            'redirection' => 5,
            'user-agent' => 'axs4all-ai-crawler/1.0 (+https://github.com/)',
        ]);
        if (is_wp_error($response)) {
            return new WP_Error('crawl_failed', sprintf(__('Failed to retrieve the URL: %s', 'a4a-ai'), $response->get_error_message()), ['status' => 502]);
        }

        $status = wp_remote_retrieve_response_code($response);
        if ($status < 200 || $status >= 300) {
            return new WP_Error('crawl_failed', sprintf(__('Received unexpected status code %d when fetching the URL.', 'a4a-ai'), $status), ['status' => 502]);
        }

        $body = wp_remote_retrieve_body($response);
        if (!is_string($body) || trim($body) === '') {
            return new WP_Error('crawl_failed', __('The fetched page was empty.', 'a4a-ai'), ['status' => 502]);
        }

        $client_id = (int) get_post_meta($post->ID, '_a4a_client_id', true);
        $categories = $client_id > 0 ? $this->get_client_categories_with_options($client_id) : [];
        $prompt = (string) get_post_meta($post->ID, '_a4a_prompt', true);
        $excerpt = $this->prepare_page_excerpt($body);
        $timestamp = gmdate('c');

        $system_message = 'You are an accessibility-focused analyst. Evaluate website content and respond strictly with valid XML following the provided schema.';
        $user_message = $this->build_ai_user_message($url, $prompt, $categories, $excerpt, $timestamp, $settings);

        $ai_response = $this->dispatch_ai_request(
            [
                ['role' => 'system', 'content' => $system_message],
                ['role' => 'user', 'content' => $user_message],
            ],
            $settings
        );

        if (is_wp_error($ai_response)) {
            return $ai_response;
        }

        $xml = $this->sanitize_xml_field($ai_response);
        update_post_meta($post->ID, '_a4a_returned_data', $xml);

        $run_time = current_time('mysql', true);
        update_post_meta($post->ID, '_a4a_run_requested_gmt', $run_time);
        update_post_meta($post->ID, '_a4a_last_run_gmt', $run_time);

        $run_time_local = function_exists('get_date_from_gmt') ? get_date_from_gmt($run_time) : current_time('mysql', false);
        wp_update_post([
            'ID' => $post->ID,
            'post_modified' => $run_time_local,
            'post_modified_gmt' => $run_time,
        ]);

        return true;
    }
    private function get_post_from_request($request) {
        $id = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::CPT_URL) {
            return new WP_Error('not_found', __('URL not found.', 'a4a-ai'), ['status' => 404]);
        }

        return $post;
    }
<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class A4A_AI_REST {
    // Local slugs to avoid coupling in Phase 2
    const CPT_URL     = 'a4a_url';
    const CPT_CLIENT  = 'a4a_client';
    const CPT_CATEGORY= 'a4a_category';
    const OPT_SETTINGS= 'a4a_ai_settings';

    public function init() : void {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    public function can_manage() { return current_user_can('manage_options'); }

    private function rest_args( { return []; }
    private function client_args( $partial = false ) { return []; }
    private function category_args( $partial = false ) { return []; }
    private function settings_args() { return []; }

    public function register_routes() : void {
        $ns = 'a4a/v1';
        register_rest_route( $ns, '/urls', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_list_urls'  ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'rest_create_url' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->rest_args() ],
        ] );
        register_rest_route( $ns, '/urls/(?P<id>\d+)', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_get_url'    ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::EDITABLE,  'callback' => [ $this, 'rest_update_url' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->rest_args(true) ],
            [ 'methods' => WP_REST_Server::DELETABLE, 'callback' => [ $this, 'rest_delete_url' ], 'permission_callback' => [ $this, 'can_manage' ] ],
        ] );
        register_rest_route( $ns, '/urls/(?P<id>\d+)/run', [
            [ 'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'rest_run_url_now' ], 'permission_callback' => [ $this, 'can_manage' ] ],
        ] );

        register_rest_route( $ns, '/clients', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_list_clients'  ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'rest_create_client' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->client_args() ],
        ] );
        register_rest_route( $ns, '/clients/(?P<id>\d+)', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_get_client'    ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::EDITABLE,  'callback' => [ $this, 'rest_update_client' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->client_args(true) ],
            [ 'methods' => WP_REST_Server::DELETABLE, 'callback' => [ $this, 'rest_delete_client' ], 'permission_callback' => [ $this, 'can_manage' ] ],
        ] );

        register_rest_route( $ns, '/categories', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_list_categories'  ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'rest_create_category' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->category_args() ],
        ] );
        register_rest_route( $ns, '/categories/(?P<id>\d+)', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_get_category'    ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::EDITABLE,  'callback' => [ $this, 'rest_update_category' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->category_args(true) ],
            [ 'methods' => WP_REST_Server::DELETABLE, 'callback' => [ $this, 'rest_delete_category' ], 'permission_callback' => [ $this, 'can_manage' ] ],
        ] );

        register_rest_route( $ns, '/settings', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_get_settings'    ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::EDITABLE,  'callback' => [ $this, 'rest_update_settings' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->settings_args() ],
        ] );
        register_rest_route( $ns, '/icons', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_list_icons' ], 'permission_callback' => [ $this, 'can_manage' ] ],
        ] );
    }

    // Handlers to be filled by migration; placeholders return consistent error
    private function not_implemented() {
        return new WP_Error( 'not_implemented', __( 'Not yet migrated', 'a4a-ai' ), [ 'status' => 500 ] );
    }

        public function rest_list_urls($request = null) {
        $client_id = $request ? absint($request->get_param('client_id')) : 0;

        $args = [
            'post_type' => self::CPT_URL,
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
            'post_type' => self::CPT_URL,
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
    public function rest_get_url($request) {
        $post = $this->get_post_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        return rest_ensure_response($this->map_post_to_item($post));
    }
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
    public function rest_run_url_now($request) {
        $post = $this->get_post_from_request($request);
        if (is_wp_error($post)) {
            return $post;
        }

        $processed = $this->execute_crawl($post);
        if (is_wp_error($processed)) {
            return $processed;
        }

        $updated = get_post($post->ID);

        return rest_ensure_response($this->map_post_to_item($updated));
    }





