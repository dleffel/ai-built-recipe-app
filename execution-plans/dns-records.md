# DNS Records Configuration

## SSL Certificate Validation Records

### Main Application Domain (recipes.dannyleffel.com)
```
Name: _6a1f56304a04a2b292dfb97632530e93.recipes.dannyleffel.com
Type: CNAME
Value: _890f7683fec8ed31fcd49d811fa36824.zfyfvmchrl.acm-validations.aws
```

### API Domain (api.recipes.dannyleffel.com)
```
Name: _36cc1e2b5fc1fa59beeaad4466943f6f.api.recipes.dannyleffel.com
Type: CNAME
Value: _588ba370dc11f4c6abf972215a08d3f5.zfyfvmchrl.acm-validations.aws
```

## Next Steps
1. Create these CNAME records in your DNS provider
2. Wait for certificate validation (can take up to 30 minutes)
3. After validation, create the following records:
   - CNAME `recipes.dannyleffel.com` -> App Runner frontend URL (will be created)
   - CNAME `api.recipes.dannyleffel.com` -> App Runner backend URL (will be created)

## Notes
- Remove the trailing dot (.) from the record names when adding to DNS
- Certificate validation must complete before we can use the custom domains in App Runner
- Keep these records for future reference