# DNS Configuration for Recipe App

## Main Domain Records

### Frontend Domain (recipes.dannyleffel.com)
Add the following CNAME record:
```
Name: recipes.dannyleffel.com
Type: CNAME
Value: ahxrqey2ku.us-east-1.awsapprunner.com
```

### API Domain (api.recipes.dannyleffel.com)
Add the following CNAME record:
```
Name: api.recipes.dannyleffel.com
Type: CNAME
Value: gcaesdnj2g.us-east-1.awsapprunner.com
```

## Certificate Validation Records

### API Domain Certificate Validation
Add these CNAME records for SSL certificate validation:
```
Name: _6ce7151b32b11343b1e8d8c17d9993bc.api.recipes.dannyleffel.com
Type: CNAME
Value: _16cd193b52445e48325d5494cdc73515.zfyfvmchrl.acm-validations.aws

Name: _78531c9100adc7d5f95b1397da23b366.www.api.recipes.dannyleffel.com
Type: CNAME
Value: _43f6ceac8cb1fbd56eaefeb752fc0977.zfyfvmchrl.acm-validations.aws

Name: _e72574adcc3dc052a3ef809e922f7f7e.2a57j780olgpdp90t2ovqk215xjqw9p.api.recipes.dannyleffel.com
Type: CNAME
Value: _ea04c50ab1a49a92b677ffb761bf6dcc.zfyfvmchrl.acm-validations.aws
```

### Frontend Domain Certificate Validation
The certificate validation records for the frontend domain have already been added.

## Notes
- After adding these CNAME records, DNS propagation may take some time (typically between a few minutes to 48 hours)
- The certificate validation will complete automatically once DNS propagation is complete
- The domains will start resolving to the App Runner services after both DNS propagation and certificate validation are complete
- Both services will then begin accepting traffic on their respective custom domains