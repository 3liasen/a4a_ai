<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class A4A_AI_REST {
    public function init() : void {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    private function plugin() : A4A_AI_Plugin {
        return A4A_AI_Plugin::instance();
    }

    public function register_routes() : void {
        $ns     = 'a4a/v1';
        $plugin = $this->plugin();

        // URLs
        register_rest_route( $ns, '/urls', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $plugin, 'rest_list_urls' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $plugin, 'rest_create_url' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
                'args'                => $plugin->rest_args(),
            ],
        ] );

        register_rest_route( $ns, '/urls/(?P<id>\\d+)', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $plugin, 'rest_get_url' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $plugin, 'rest_update_url' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
                'args'                => $plugin->rest_args( true ),
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $plugin, 'rest_delete_url' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
        ] );

        register_rest_route( $ns, '/urls/(?P<id>\\d+)/run', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $plugin, 'rest_run_url_now' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
        ] );

        // Clients
        register_rest_route( $ns, '/clients', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $plugin, 'rest_list_clients' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $plugin, 'rest_create_client' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
                'args'                => $plugin->client_args(),
            ],
        ] );

        register_rest_route( $ns, '/clients/(?P<id>\\d+)', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $plugin, 'rest_get_client' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $plugin, 'rest_update_client' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
                'args'                => $plugin->client_args( true ),
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $plugin, 'rest_delete_client' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
        ] );

        // Categories
        register_rest_route( $ns, '/categories', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $plugin, 'rest_list_categories' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $plugin, 'rest_create_category' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
                'args'                => $plugin->category_args(),
            ],
        ] );

        register_rest_route( $ns, '/categories/(?P<id>\\d+)', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $plugin, 'rest_get_category' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $plugin, 'rest_update_category' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
                'args'                => $plugin->category_args( true ),
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $plugin, 'rest_delete_category' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
        ] );

        // Settings
        register_rest_route( $ns, '/settings', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $plugin, 'rest_get_settings' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $plugin, 'rest_update_settings' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
                'args'                => $plugin->settings_args(),
            ],
        ] );

        // Icons
        register_rest_route( $ns, '/icons', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $plugin, 'rest_list_icons' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
        ] );

        register_rest_route( $ns, '/debug-log', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $plugin, 'rest_get_debug_log' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $plugin, 'rest_append_debug_log' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
                'args'                => $plugin->debug_log_args(),
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $plugin, 'rest_clear_debug_log' ],
                'permission_callback' => [ $plugin, 'can_manage' ],
            ],
        ] );
    }
}

