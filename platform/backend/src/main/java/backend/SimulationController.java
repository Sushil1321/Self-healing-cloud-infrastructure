
package backend;

import java.io.IOException;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
public class SimulationController {

    @PostMapping("/api/simulate-failure")
    public String simulateFailure() throws IOException, InterruptedException {

        Process process = new ProcessBuilder(
            "docker", "stop", "self-healing-test"
        )
        .redirectErrorStream(true)
        .start();

        String output = new String(
            process.getInputStream().readAllBytes()
        );

        int exitCode = process.waitFor();

        if (exitCode == 0) {
            return "Failure simulated. The monitor should detect it and recover the application.";
        }

        throw new IllegalStateException(
            "Could not stop test container. " + output
        );
    }
}
