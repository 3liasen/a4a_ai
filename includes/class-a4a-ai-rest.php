<?php
// header-clean
if ( ! defined( 'ABSPATH' ) ) { exit; }

require_once __DIR__ . '/constants.php';

class A4A_AI_REST {
    public function init() : void {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    public function can_manage() { return current_user_can('manage_options'); }

    private function rest_args( $partial = false ) { return []; }
    private function client_args( $partial = false ) { return []; }
    private function category_args( $partial = false ) { return []; }
    private function settings_args() { return []; }

    public function register_routes() : void {
        $ns = 'a4a/v1';
        register_rest_route( $ns, '/urls', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_list_urls'  ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'rest_create_url' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->rest_args() ],
        ] );
        register_rest_route( $ns, '/urls/(?P<id>\\d+)', [
            [ 'methods' => WP_REST_Server::READABLE,  'callback' => [ $this, 'rest_get_url'    ], 'permission_callback' => [ $this, 'can_manage' ] ],
            [ 'methods' => WP_REST_Server::EDITABLE,  'callback' => [ $this, 'rest_update_url' ], 'permission_callback' => [ $this, 'can_manage' ], 'args' => $this->rest_args(true) ],
            [ 'methods' => WP_REST_Server::DELETABLE, 'callback' => [ $this, 'rest_delete_url' ], 'permission_callback' => [ $this, 'can_manage' ] ],
        ] );
        register_rest_route( $ns, '/urls/(?P<id>\\d+)/run', [
            [ 'methods' => WP_REST_Server::CREATABLE, 'callback' => [ $this, 'rest_run_url_now' ], 'permission_callback' => [ $this, 'can_manage' ] ],
        ] );
    }

    // Placeholder implementations until fully migrated
    public function rest_list_urls( $request = null ) { return new WP_Error('not_implemented'); }
    public function rest_create_url( $request ) { return new WP_Error('not_implemented'); }
    public function rest_get_url( $request ) { return new WP_Error('not_implemented'); }
    public function rest_update_url( $request ) { return new WP_Error('not_implemented'); }
    public function rest_delete_url( $request ) { return new WP_Error('not_implemented'); }
    public function rest_run_url_now( $request ) { return new WP_Error('not_implemented'); }
}

