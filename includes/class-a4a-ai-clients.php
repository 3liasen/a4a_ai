<?php
// header-clean
if ( ! defined( 'ABSPATH' ) ) { exit; }

class A4A_AI_Clients {
    public function get_meta( int $post_id, string $key, $default = null ) {
        $val = get_post_meta( $post_id, $key, true );
        return $val === '' ? $default : $val;
    }
}

