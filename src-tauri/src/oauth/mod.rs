use anyhow::Result;
use oauth2::{
    basic::{BasicClient, BasicErrorResponseType, BasicTokenType},
    reqwest::{redirect::Policy, ClientBuilder},
    *,
};
use tauri::Url;

pub mod server;

pub struct Oauth {
    pub client: Client<
        StandardErrorResponse<BasicErrorResponseType>,
        StandardTokenResponse<EmptyExtraTokenFields, BasicTokenType>,
        StandardTokenIntrospectionResponse<EmptyExtraTokenFields, BasicTokenType>,
        StandardRevocableToken,
        StandardErrorResponse<RevocationErrorResponseType>,
        EndpointSet,
        EndpointNotSet,
        EndpointNotSet,
        EndpointNotSet,
        EndpointSet,
    >,
    pub http_client: reqwest::Client,
}

impl Oauth {
    pub fn new(client_id: &str, client_secret: &str, redirect_url: &str) -> Result<Self> {
        let github_client_id = ClientId::new(client_id.to_string());
        let github_client_secret = ClientSecret::new(client_secret.to_string());

        let auth_url = AuthUrl::new("https://github.com/login/oauth/authorize".to_string())?;
        let token_url = TokenUrl::new("https://github.com/login/oauth/access_token".to_string())?;
        let redirect_url = RedirectUrl::new(redirect_url.to_string())?;

        let client = BasicClient::new(github_client_id)
            .set_client_secret(github_client_secret)
            .set_auth_uri(auth_url)
            .set_token_uri(token_url)
            .set_redirect_uri(redirect_url);

        let http_client = ClientBuilder::new().redirect(Policy::none()).build()?;
        Ok(Self {
            client,
            http_client,
        })
    }

    pub fn get_auth_url(&self) -> (Url, CsrfToken, PkceCodeVerifier) {
        let (pkce_code_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();
        let (url, csrf_token) = self
            .client
            .authorize_url(CsrfToken::new_random)
            .add_scope(Scope::new("public_repo".to_string()))
            .add_scope(Scope::new("user:email".to_string()))
            .set_pkce_challenge(pkce_code_challenge)
            .url();
        (url, csrf_token, pkce_verifier)
    }

    pub async fn exchange_code(
        &self,
        code: &str,
        pkce_verifier: PkceCodeVerifier,
    ) -> Result<StandardTokenResponse<EmptyExtraTokenFields, BasicTokenType>> {
        let res = self
            .client
            .exchange_code(AuthorizationCode::new(code.to_string()))
            .set_pkce_verifier(pkce_verifier)
            .request_async(&self.http_client)
            .await?;

        Ok(res)
    }
}
