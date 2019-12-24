# USAGE:
#
# > cd [path_to_project]/functions
# > yarn deploy [cloud_function_name (optional)]
#
# If cloud function name is provided, only the provided cloud function will get deployed

deploy()
{
    if [ "$1" != "" ]; then
        firebase deploy --only functions:$1
    else
        firebase deploy --only functions
    fi
}

firebase use your-project-id

firebase functions:config:set google.storage_bucket="gs://your-project-name.appspot.com/" google.recaptcha_secret="your_recaptcha_secret" algolia.app_id="your_algolia_app_id" algolia.read_write_api_key="your_algolia_read_write_key" mux.token_id="your_mux_token_id" mux.token_secret="your_mux_token_secret" algolia.places_index_name="production_places" algolia.outfits_index_name="production_outfits" algolia.bundles_index_name="production_bundles"

deploy $1
