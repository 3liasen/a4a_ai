<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class A4A_AI_REST {
    public function init() : void {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    /**
     * Register REST API routes mirroring current endpoints in a4a_ai.php
     */
    public function register_routes() : void {
        $ns = 'a4a/v1';
        // URLs
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

        // Clients
        register_rest_route( $ns, '/clients', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_list_clients'  ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'rest_create_client' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->client_args() ],
        ] );
        register_rest_route( $ns, '/clients/(?P<id>\d+)', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_get_client'    ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::EDITABLE,  'callback' => [ $this, 'rest_update_client' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->client_args(true) ],
            [ 'methods' => WP_REST_Server::DELETABLE, 'callback' => [ $this, 'rest_delete_client' ], 'permission_callback' => [ $this, 'can_manage' ] ],
        ] );

        // Categories
        register_rest_route( $ns, '/categories', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_list_categories'  ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'rest_create_category' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->category_args() ],
        ] );
        register_rest_route( $ns, '/categories/(?P<id>\d+)', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_get_category'    ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::EDITABLE,  'callback' => [ $this, 'rest_update_category' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->category_args(true) ],
            [ 'methods' => WP_REST_Server::DELETABLE, 'callback' => [ $this, 'rest_delete_category' ], 'permission_callback' => [ $this, 'can_manage' ] ],
        ] );

        // Settings and icons
        register_rest_route( $ns, '/settings', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_get_settings'    ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::EDITABLE,  'callback' => [ $this, 'rest_update_settings' ], 'permission_callback' => [ $this, 'can_manage' ] ],
        ] );
        register_rest_route( $ns, '/icons', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_list_icons' ], 'permission_callback' => [ $this, 'can_manage' ] ],
        ] );
    }

    // Placeholder methods to be filled by extraction in Phase 2
    public function can_manage() { return current_user_can('manage_options'); }
    private function rest_args( $partial = false ) { return []; }
    private function client_args( $partial = false ) { return []; }
    private function category_args( $partial = false ) { return []; }

    public function rest_list_urls( $request = null ) { return new WP_Error('not_implemented'); }
    public function rest_create_url( $request ) { return new WP_Error('not_implemented'); }
    public function rest_get_url( $request ) { return new WP_Error('not_implemented'); }
    public function rest_update_url( $request ) { return new WP_Error('not_implemented'); }
    public function rest_delete_url( $request ) { return new WP_Error('not_implemented'); }
    public function rest_run_url_now( $request ) { return new WP_Error('not_implemented'); }

    public function rest_list_clients( $request ) { return new WP_Error('not_implemented'); }
    public function rest_get_client( $request ) { return new WP_Error('not_implemented'); }
    public function rest_create_client( $request ) { return new WP_Error('not_implemented'); }
    public function rest_update_client( $request ) { return new WP_Error('not_implemented'); }
    public function rest_delete_client( $request ) { return new WP_Error('not_implemented'); }

    public function rest_list_categories() { return new WP_Error('not_implemented'); }
    public function rest_get_category( $request ) { return new WP_Error('not_implemented'); }
    public function rest_create_category( $request ) { return new WP_Error('not_implemented'); }
    public function rest_update_category( $request ) { return new WP_Error('not_implemented'); }
    public function rest_delete_category( $request ) { return new WP_Error('not_implemented'); }

    public function rest_get_settings( $request ) { return new WP_Error('not_implemented'); }
    public function rest_update_settings( $request ) { return new WP_Error('not_implemented'); }
    public function rest_list_icons( $request ) { return new WP_Error('not_implemented'); }
}
