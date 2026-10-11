import { Footer, Link, Logo } from "../App";
import { RuntimeConfig } from "../auth";
import { Plate } from "../Plate";

export function Landing({ cfg }: { cfg: RuntimeConfig }) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
          <Link to="/" className="brand"><Logo /> ProofPlate</Link>
          <span className="spacer" />
          <Link to="/signin" className="btn sm">Pilot sign-in</Link>
          <Link to="/demo/serve" className="btn sm primary">Try the demo</Link>
        </div>
      </header>
      <main className="page">
        <section className="hero">
          <div>
            <h3>For college mess kitchens</h3>
            <h1 style={{ marginTop: 10 }}>Serve a better first portion. Keep seconds easy. Show what changed.</h1>
            <p className="lede">
              ProofPlate learns how much of each dish a diner usually chooses to eat, suggests the first portion, and turns
              what came back on the plates into the kitchen's next preparation plan.
            </p>
            <div className="row cta">
              <Link to="/demo/serve" className="btn big primary">Try the demo</Link>
              <Link to="/signin" className="btn big">Pilot workspace</Link>
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>
              The demo runs on generated data, clearly labelled. The pilot workspace starts empty and holds only what your operators record.
            </p>
          </div>
          <div className="card">
            <h3>Same empty plate, different evidence</h3>
            <div className="duo" style={{ marginTop: 14 }}>
              <div className="card flat tight">
                <Plate scoops={3} size={130} tone="ghost" label="An empty plate after three scoops" />
                <p style={{ fontWeight: 650, marginTop: 6 }}>“That was enough.”</p>
                <p className="small muted">Appetite was about three scoops.</p>
              </div>
              <div className="card flat tight">
                <Plate scoops={3} size={130} tone="ghost" label="The same empty plate after three scoops" />
                <p style={{ fontWeight: 650, marginTop: 6 }}>“I wanted more.”</p>
                <p className="small muted">Appetite was at least three scoops.</p>
              </div>
            </div>
            <p className="small" style={{ marginTop: 14 }}>
              A scale cannot tell these apart. A system that treats both as “three scoops is right” keeps under-serving the
              hungry diner. ProofPlate records the difference and learns from each one correctly.
            </p>
          </div>
        </section>

        <section className="card" style={{ marginTop: 22 }}>
          <h3>The loop</h3>
          <ol className="steps" style={{ padding: 0, margin: "14px 0 0" }}>
            <li><strong>Calibrate the scoop.</strong><br /><span className="muted">Weigh about twenty scoops of the cooked dish once per recipe.</span></li>
            <li><strong>Suggest a first portion.</strong><br /><span className="muted">With the likely range and the reason. The diner can always choose differently.</span></li>
            <li><strong>Record seconds and the return.</strong><br /><span className="muted">Grams left, “was that enough?”, and why food was left.</span></li>
            <li><strong>Update the estimate.</strong><br /><span className="muted">“Wanted more” is a lower bound, not a target. Unclear plates are not used.</span></li>
            <li><strong>Plan the kitchen.</strong><br /><span className="muted">Initial batch, reserve, and a visible warning when a plan cannot work.</span></li>
          </ol>
        </section>

        <section className="grid cols-3" style={{ marginTop: 18 }}>
          <div className="card">
            <h3>What it is not</h3>
            <p style={{ marginTop: 8 }}>Not a diet, calorie or health tool. No names, faces or body data. A suggestion never overrides what a diner asks for.</p>
          </div>
          <div className="card">
            <h3>Honest numbers</h3>
            <p style={{ marginTop: 8 }}>Every figure is tagged observed, predicted or simulated, with its sample size. A missing return counts as missing, not as zero waste.</p>
          </div>
          <div className="card">
            <h3>Runs on AWS</h3>
            <p style={{ marginTop: 8 }}>CloudFront and S3 serve this page. API Gateway and Lambda run the model. DynamoDB keeps pilot records. Cognito signs operators in.</p>
          </div>
        </section>
      </main>
      <Footer cfg={cfg} />
    </div>
  );
}
