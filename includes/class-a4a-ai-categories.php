<?php
// header-clean
if ( ! defined( 'ABSPATH' ) ) { exit; }

class A4A_AI_Categories {
    public function sanitize_name( string $name ) : string {
        return sanitize_text_field( $name );
    }
}

