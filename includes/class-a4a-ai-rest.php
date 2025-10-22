<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class A4A_AI_REST {
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
            'post_type' => A4A_AI_Config::CPT_URL,
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
            'post_type' => A4A_AI_Config::CPT_URL,
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






        if (!$post || $post->post_type !== A4A_AI_Config::CPT_CLIENT) {
            return new WP_Error('not_found', __('Client not found.', 'a4a-ai'), ['status' => 404]);
        }

        return $post;
    }

     * Maps a client post to an array.
     *


        return [

        if (!is_dir($directory) || !is_readable($directory)) {
            return [];
        }

            $id = absint($maybe_id);
            if ($id > 0 && $this->validate_category_param($id)) {
                $sanitised[$id] = $id;
            }

     * @param bool            $partial
     */

        if (!is_array($categories) || !$categories) {
            return [];
        }




