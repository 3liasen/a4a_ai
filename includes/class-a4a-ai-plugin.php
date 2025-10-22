<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

class A4A_AI_Plugin {
    const VERSION = '0.1.0-skeleton';

    public function init() : void {
        add_action( 'admin_menu', [ $this, 'register_admin_menu' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_assets' ] );
        do_action( 'a4a_ai/init' );
    }

    public function register_admin_menu() : void {
        add_menu_page(
            __( 'A4A AI', 'a4a-ai' ),
            __( 'A4A AI', 'a4a-ai' ),
            'manage_options',
            'a4a-ai',
            [ $this, 'render_admin_page' ],
            'dashicons-art',
            58
        );
    }

    public function render_admin_page() : void {
        echo '<div class="wrap"><h1>' . esc_html__( 'A4A AI', 'a4a-ai' ) . '</h1>';
        echo '<div id="a4a-ai-root"></div></div>';
    }

    public function enqueue_admin_assets( string $hook ) : void {
        if ( $hook !== 'toplevel_page_a4a-ai' ) {
            return;
        }

        $handle = 'a4a-ai-admin';
        $src    = plugins_url( 'assets/admin.js', __FILE__ );
        if ( defined( 'A4A_AI_PLUGIN_FILE' ) ) {
            $src = plugins_url( 'assets/admin.js', A4A_AI_PLUGIN_FILE );
        }

        wp_enqueue_script( $handle, $src, [], self::VERSION, true );
        wp_localize_script( $handle, 'a4aAI', [
            'restUrl' => esc_url_raw( rest_url( 'a4a/v1' ) ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
        ] );
    }
}
