<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class A4A_AI_REST {
    public function init() : void {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    public function register_routes() : void {
        // Skeleton namespace and a ping route to validate wiring
        register_rest_route( 'a4a/v1', '/ping', [
            'methods'  => WP_REST_Server::READABLE,
            'callback' => function( WP_REST_Request $req ) {
                return rest_ensure_response( [ 'ok' => true, 'time' => time() ] );
            },
            'permission_callback' => function() { return current_user_can( 'manage_options' ); },
        ] );
    }
}
