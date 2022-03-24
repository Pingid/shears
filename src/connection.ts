import https from 'https'

import { connect } from './connect'

export const defaultConnection = connect<{ hostname?: string }>(
  (url, ctx) =>
    new Promise<[string, { hostname: string }]>((resolve, reject) => {
      const _url = ctx?.hostname && !/^http.*|^www\.*/.test(url) ? ctx.hostname + url : url
      const req = https
        .get(_url, { method: 'GET' }, (res) => {
          let data: any[] = []
          res.on('data', (chunk: any) => {
            data.push(chunk)
          })
          res.on('end', () => {
            const html = Buffer.concat(data).toString()
            resolve([html, { hostname: req.protocol + '//' + req.host }])
          })
        })
        .on('error', reject)
    }),
  {}
)
